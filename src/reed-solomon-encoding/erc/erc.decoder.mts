/* --------------------------------------------------------------
   ReedSolomon – 1‑to‑1 port using Uint8Array (TypeScript)
   -------------------------------------------------------------- */

import gf, { EXP_TABLE } from "./gf256.mts";
import poly from "./polynomial.mts";

export class ReedSolomonDecoder {
    private readonly nSym: number;

    constructor(nSym: number) {
        this.nSym = nSym;
    }

    /**
     * Decode a block that was produced by {@link encode}.
     *
     * @param data – Uint8Array containing data + parity.
     * @returns Uint8Array containing only the original data bytes.
     */
    decode(data: Uint8Array): Uint8Array {
        const corrected = this._correctMsg(data);
        // Strip off the parity bytes
        return corrected.subarray(0, corrected.length - this.nSym);
    }

    /** Main correction routine – returns a **new Uint8Array** (full codeword). */
    _correctMsg(codeword: Uint8Array): Uint8Array {
        const synd = this._calcSyndromes(codeword);
        const allZero = synd.every((s) => s === 0);
        if (allZero) {
            return new Uint8Array(codeword); // nothing to fix
        }

        // 1️⃣ Locate the error positions (full codeword length!)
        const errPos = this._findErrorLocations(synd, codeword.length);

        // 2️⃣ Compute the error magnitudes (Forney)
        const corrected = this._correctErrorValues(codeword, synd, errPos)
        return corrected;
    }

    _correctErrorValues(codeword: Uint8Array, synd: Uint8Array, errPos: number[]) {
        // 1️⃣ Compute the error locator polynomial q(x) = ∏ (1 - x_i * x)
        var q = new Uint8Array([1]) as Uint8Array<ArrayBufferLike>;
        for (var i = 0; i < errPos.length; i++) {
            // x = α^{position from right}
            var x = EXP_TABLE[codeword.length - 1 - errPos[i]];
            q = poly.mul(q, new Uint8Array([x, 1]));  // multiply q by (x_i, 1)
        }

        // 2️⃣ Compute the error evaluator polynomial p(x) = [syndromes * q(x)] mod x^{errCount}
        // Take syndromes of length errCount, reverse for proper poly order
        var p = synd.slice(0, errPos.length) as Uint8Array<ArrayBufferLike>;
        p.reverse();
        p = poly.mul(p, q);
        // Truncate p to last errCount coefficients (mod x^errCount)
        p = p.slice(p.length - errPos.length, p.length);

        // 3️⃣ Compute derivative q'(x), by taking every other coefficient starting at q.length&1
        q = poly.sliceStep(q, q.length & 1, q.length, 2);

        // 4️⃣ Calculate error magnitudes and correct the codeword
        for (var i = 0; i < errPos.length; i++) {
            // Evaluate at x = α^{position from left}
            var x = EXP_TABLE[errPos[i] + 256 - codeword.length];
            var y = poly.eval(p, x);           // Evaluate p(x)
            var z = poly.eval(q, gf.mul(x, x)); // Evaluate q'(x^2)

            var magnitude = gf.div(y, gf.mul(x, z)); // Compute error magnitude
            console.log(`errval-new[${errPos[i]}] =`, magnitude);

            // Correct the error in the codeword by XORing the magnitude
            codeword[errPos[i]] ^= magnitude;
        }

        return codeword;
    }



    /** Compute the syndrome vector S = [r(α¹), r(α²), …, r(αⁿˢ)] */
    _calcSyndromes(data: Uint8Array) {
        const synd = new Uint8Array(this.nSym);
        for (let i = 0; i < this.nSym; i++) {
            const evalPoint = EXP_TABLE[i];   // αⁱ
            synd[i] = poly.eval(data, evalPoint);
        }
        return synd;
    }

    /** Berlekamp‑Massey to obtain the error‑locator polynomial Λ(x). */
    private _findErrorLocator(synd: Uint8Array): Uint8Array {
        let lambda = new Uint8Array([1]) as Uint8Array<ArrayBufferLike>;    // Λ(x) = 1
        let B = new Uint8Array([1]) as Uint8Array<ArrayBufferLike>;         // Previous Λ(x), B(x)
        let L = 0;                                                          // Current degree of Λ
        let m = 1;                                                          // Iterations since last update of B

        for (let n = 0; n < this.nSym; n++) {
            // ---- Compute discrepancy delta ----
            let delta = synd[n];

            // MSB-first access: lambda[0] is highest degree term
            const lambdaDeg = lambda.length - 1;
            for (let i = 1; i <= L; i++) {
                const syndIdx = n - i;
                if (syndIdx < 0) continue;  // out of bounds early in the loop
                const lambdaCoeff = lambda[lambdaDeg - i];
                delta ^= gf.mul(lambdaCoeff, synd[syndIdx]);
            }

            // ---- Update polynomials if discrepancy is non-zero ----
            if (delta !== 0) {
                const deltaB = poly.scale(B, delta);
                const deltaBshifted = poly.shiftLeft(deltaB, m);
                const lambdaNew = poly.add(lambda, deltaBshifted);

                // Update B if we're improving Λ
                if (2 * L <= n) {
                    B = poly.scale(lambda, gf.inv(delta));
                    L = n + 1 - L;
                    m = 1;
                } else {
                    m++;
                }

                lambda = lambdaNew;
            } else {
                m++;
            }
        }

        return poly.trim(lambda);  // strip any leading zeros just in case
    }


    /** Locate error positions from the error‑locator polynomial. */
    _findErrorLocations(synd: Uint8Array, messageLen: number): number[] {
        const locator = this._findErrorLocator(synd);
        const errs = locator.length - 1;

        const errPos: number[] = [];

        // Standard Chien search loop (descending exponent)
        for (let i = 0; i < messageLen; i++) {
            const x = gf.exp(255 - i);  // α^{255 - i}
            if (poly.eval(locator, x) === 0) {
                const pos = messageLen - 1 - i;
                errPos.push(pos);
            }
        }

        if (errPos.length !== errs) {
            throw new Error("Could not locate error positions correctly");
        }

        return errPos;
    }
}