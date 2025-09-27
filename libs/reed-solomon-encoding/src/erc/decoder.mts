/* --------------------------------------------------------------
   ReedSolomon – 1‑to‑1 port using Uint8Array (TypeScript)
   -------------------------------------------------------------- */

import gf, { EXP_TABLE } from "./gf256.mts";
import poly from "./polynomial.mts";

export function createDecoder(nSym: number) {

    const corrector = createErrorCorrector(nSym);

    function decodeBlock(data: Uint8Array): Uint8Array {
        
        const corrected = corrector.correctErrors(data);
        // Strip off the parity bytes
        return corrected.subarray(0, corrected.length - nSym);
    }

    /**
     * Decode a byteArray that was produced by {@link encode}.
     *
     * @param data – Uint8Array containing data + parity.
     * @returns Uint8Array containing only the original data bytes.
     */
    function decode(data: Uint8Array): Uint8Array {
        const blockLen = 255;
        const blocks: Uint8Array[] = [];

        for (let i = 0; i < data.length; i += blockLen) {
            const block = data.subarray(i, i + blockLen);
            blocks.push(decodeBlock(block));
        }

        // Concatenate all data blocks
        const totalLen = blocks.reduce((acc, b) => acc + b.length, 0);
        const out = new Uint8Array(totalLen);

        let offset = 0;
        for (const b of blocks) {
            out.set(b, offset);
            offset += b.length;
        }

        return out;
    }

    return {
        decode
    }

}

export function createErrorCorrector(nSym: number) {

    /** Main correction routine – returns a **new Uint8Array** (full codeword). */
    function correctErrors(data: Uint8Array): Uint8Array {
        const synd = calcSyndromes(data);
        const allZero = synd.every((s) => s === 0);
        if (allZero) {
            return new Uint8Array(data); // nothing to fix
        }

        // 1️⃣ Locate the error positions (full codeword length!)
        const errPos = findErrorLocations(synd, data.length);

        // 2️⃣ Compute the error magnitudes (Forney)
        const corrected = correctErrorValues(data, synd, errPos)
        return corrected;
    }

    function correctErrorValues(data: Uint8Array, synd: Uint8Array, errPos: number[]) {
        // 1️⃣ Compute the error locator polynomial q(x) = ∏ (1 - x_i * x)
        let q = new Uint8Array([1]) as Uint8Array<ArrayBufferLike>;
        for (let i = 0; i < errPos.length; i++) {
            // x = α^{position from right}
            const x = EXP_TABLE[data.length - 1 - errPos[i]];
            q = poly.mul(q, new Uint8Array([x, 1]));  // multiply q by (x_i, 1)
        }

        // 2️⃣ Compute the error evaluator polynomial p(x) = [syndromes * q(x)] mod x^{errCount}
        // Take syndromes of length errCount, reverse for proper poly order
        let p = synd.slice(0, errPos.length) as Uint8Array<ArrayBufferLike>;
        p.reverse();
        p = poly.mul(p, q);
        // Truncate p to last errCount coefficients (mod x^errCount)
        p = p.slice(p.length - errPos.length, p.length);

        // 3️⃣ Compute derivative q'(x), by taking every other coefficient starting at q.length&1
        q = poly.sliceStep(q, q.length & 1, q.length, 2);

        // 4️⃣ Calculate error magnitudes and correct the codeword
        for (let i = 0; i < errPos.length; i++) {
            // Evaluate at x = α^{position from left}
            const x = EXP_TABLE[errPos[i] + 256 - data.length];
            const y = poly.eval(p, x);           // Evaluate p(x)
            const z = poly.eval(q, gf.mul(x, x)); // Evaluate q'(x^2)

            const magnitude = gf.div(y, gf.mul(x, z)); // Compute error magnitude

            // Correct the error in the codeword by XORing the magnitude
            data[errPos[i]] ^= magnitude;
        }

        return data;
    }



    /** Compute the syndrome vector S = [r(α¹), r(α²), …, r(αⁿˢ)] */
    function calcSyndromes(data: Uint8Array) {
        const synd = new Uint8Array(nSym);
        for (let i = 0; i < nSym; i++) {
            const evalPoint = EXP_TABLE[i];   // αⁱ
            synd[i] = poly.eval(data, evalPoint);
        }
        return synd;
    }

    /** Berlekamp‑Massey to obtain the error‑locator polynomial Λ(x). */
    function findErrorLocator(synd: Uint8Array): Uint8Array {
        let lambda = new Uint8Array([1]) as Uint8Array<ArrayBufferLike>;    // Λ(x) = 1
        let B = new Uint8Array([1]) as Uint8Array<ArrayBufferLike>;         // Previous Λ(x), B(x)
        let L = 0;                                                          // Current degree of Λ
        let m = 1;                                                          // Iterations since last update of B

        for (let n = 0; n < nSym; n++) {
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
    function findErrorLocations(synd: Uint8Array, messageLen: number): number[] {
        const locator = findErrorLocator(synd);
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

    return {
        correctErrors,
        calcSyndromes,
        findErrorLocations,
        correctErrorValues
    }
}