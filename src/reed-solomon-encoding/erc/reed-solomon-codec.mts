import gf, { EXP_TABLE } from "./gf256.mts";
import poly from "./polynomial.mts";

/**
 * Create a Uint8Array filled with a constant value.
 */
function arrayFill(size: number, value: number): Uint8Array {
    const arr = new Uint8Array(size);
    arr.fill(value);
    return arr;
}

/**
 * Slice an array with a step (mirrors the original `sliceStep`).
 */
function sliceStep(
    array: Uint8Array,
    from: number,
    to: number,
    step: number
): Uint8Array {
    const sliced = array.slice(from, to);
    const stepped: number[] = [];

    for (let i = sliced.length - 1; i >= 0; i--) {
        if (i % step === 0) stepped.push(sliced[i]);
    }
    stepped.reverse();
    return new Uint8Array(stepped);
}

export class ReedSolomonCodec {

    /** Build the generator polynomial for `nSym` parity symbols. */
    public generatorPoly(nSym: number): Uint8Array {
        let g: Uint8Array<ArrayBufferLike> = new Uint8Array([1]);
        for (let i = 0; i < nSym; i++) {
            g = poly.mul(g, new Uint8Array([1, EXP_TABLE[i]]));
        }
        return g;
    }

    /** Encode a message (data bytes) into data + parity. */
    public encodeMsg(msgIn: Uint8Array, nSym: number): Uint8Array {
        if (msgIn.length + nSym > 255) throw new Error('Message too long.');

        const gen = this.generatorPoly(nSym);
        const msgOut = arrayFill(msgIn.length + nSym, 0);
        msgOut.set(msgIn, 0); // copy data part

        for (let i = 0; i < msgIn.length; i++) {
            const coef = msgOut[i];
            if (coef !== 0) {
                for (let j = 0; j < gen.length; j++) {
                    msgOut[i + j] ^= gf.mul(gen[j], coef);
                }
            }
        }

        // restore original data (mirrors original code)
        msgOut.set(msgIn, 0);
        return msgOut;
    }

    /** Compute syndromes for a received block. */
    public calcSyndromes(msg: Uint8Array, nSym: number): Uint8Array {
        const r = new Uint8Array(nSym);
        for (let i = 0; i < nSym; i++) {
            r[i] = poly.eval(msg, EXP_TABLE[i]);
        }
        return r;
    }

    /** Apply Forney correction for known erasures. */
    public correctErrata(
        msg: Uint8Array,
        synd: Uint8Array,
        pos: number[]
    ): Uint8Array {
        let q: Uint8Array<ArrayBufferLike> = new Uint8Array([1]);

        for (const p of pos) {
            const x = EXP_TABLE[msg.length - 1 - p];
            q = poly.mul(q, new Uint8Array([x, 1]));
        }

        // p = reversed(synd[0..pos.length]) * q
        let p: Uint8Array<ArrayBufferLike> = synd.slice(0, pos.length);
        p = new Uint8Array(p.reverse());
        p = poly.mul(p, q);
        p = p.slice(p.length - pos.length, p.length);
        q = sliceStep(q, q.length & 1, q.length, 2);

        for (let i = 0; i < pos.length; i++) {
            const x = EXP_TABLE[pos[i] + 256 - msg.length];
            const y = poly.eval(p, x);
            const z = poly.eval(q, gf.mul(x, x));
            msg[pos[i]] ^= gf.div(y, gf.mul(x, z));
        }

        return msg;
    }

    /** Berlekamp‑Massey error locator finder. */
    public rsFindErrors(synd: Uint8Array, nMess: number): number[] | null {
        let errPoly: Uint8Array<ArrayBufferLike> = new Uint8Array([1]);
        let oldPoly: Uint8Array<ArrayBufferLike> = new Uint8Array([1]);

        for (let i = 0; i < synd.length; i++) {
            // oldPoly ← oldPoly·x (prepend a zero)
            const shifted = arrayFill(oldPoly.length + 1, 0);
            shifted.set(oldPoly, 1);
            oldPoly = shifted;

            let delta = synd[i];
            for (let j = 1; j < errPoly.length; j++) {
                delta ^= gf.mul(errPoly[errPoly.length - 1 - j], synd[i - j]);
            }

            if (delta !== 0) {
                if (oldPoly.length > errPoly.length) {
                    const newPoly = poly.scale(oldPoly, delta);
                    oldPoly = poly.scale(errPoly, gf.div(1, delta));
                    errPoly = newPoly;
                }
                errPoly = poly.add(errPoly, poly.scale(oldPoly, delta));
            }
        }

        const errs = errPoly.length - 1;
        if (errs * 2 > synd.length) throw new Error('Too many errors to correct');

        const errPos: number[] = [];
        for (let i = 0; i < nMess; i++) {
            if (poly.eval(errPoly, EXP_TABLE[255 - i]) === 0) {
                errPos.push(nMess - 1 - i);
            }
        }

        return errPos.length === errs ? errPos : null;
    }

    /** Forney syndromes – used when erasures are present. */
    public forneySyndromes(
        synd: Uint8Array,
        pos: number[],
        nMess: number
    ): Uint8Array {
        let fsynd = new Uint8Array(synd);

        for (const p of pos) {
            const x = EXP_TABLE[nMess - 1 - p];
            for (let j = 0; j < fsynd.length - 1; j++) {
                fsynd[j] = gf.mul(fsynd[j], x) ^ fsynd[j + 1];
            }
            fsynd = fsynd.slice(0, fsynd.length - 1);
        }
        return fsynd;
    }

    /** Full correction of a 255‑byte block (data + parity). */
    public correctMsg(msgIn: Uint8Array, nSym: number): Uint8Array {
        if (msgIn.length > 255) throw new Error('Message too long');

        const msgOut = msgIn.slice();
        const erasePos: number[] = [];

        for (let i = 0; i < msgOut.length; i++) {
            if (msgOut[i] < 0) {
                msgOut[i] = 0;
                erasePos.push(i);
            }
        }

        if (erasePos.length > nSym) throw new Error('Too many erasures to correct');

        let synd = this.calcSyndromes(msgOut, nSym);
        if (Math.max(...synd) === 0) {
            // No errors – strip parity and return data.
            return msgOut.slice(0, msgOut.length - nSym);
        }

        const fsynd = this.forneySyndromes(synd, erasePos, msgOut.length);
        const errPos = this.rsFindErrors(fsynd, msgOut.length);
        if (errPos === null) throw new Error('Could not locate error');

        const corrected = this.correctErrata(
            msgOut,
            synd,
            erasePos.concat(errPos)
        );

        synd = this.calcSyndromes(corrected, nSym);
        if (Math.max(...synd) > 0) throw new Error('Could not correct message');

        return corrected.slice(0, -nSym);
    }
}