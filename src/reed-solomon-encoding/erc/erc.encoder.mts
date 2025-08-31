import gf from "./gf256.mts";
import poly from "./polynomial.mts";

export class ReedSolomonEncoder {
    private readonly nSym: number;
    private readonly generator: Uint8Array;

    constructor(nSym: number) {
        this.nSym = nSym;
        this.generator = poly.createGenerator(nSym);
    }

    /**
     * Encode arbitrary binary data.
     *
     * @param data – Uint8Array containing the raw bytes.
     * @returns Uint8Array containing data + parity (length is a multiple of 255).
     */
    encode(data: Uint8Array): Uint8Array {
        const blockDataLen = 255 - this.nSym;
        const blocks: Uint8Array[] = [];

        for (let i = 0; i < data.length; i += blockDataLen) {
            const chunk = data.subarray(i, i + blockDataLen);

            const msg = new Uint8Array(chunk.length + this.nSym);
            msg.set(chunk);

            const remainder = this._calcRemainder(msg);
            msg.set(remainder, chunk.length);

            blocks.push(msg);
        }

        // Concatenate all blocks into one Uint8Array
        const totalLen = blocks.reduce((acc, b) => acc + b.length, 0);
        const out = new Uint8Array(totalLen);

        let offset = 0;
        for (const b of blocks) {
            out.set(b, offset);
            offset += b.length;
        }

        return out;
    }


    /** Compute the remainder of msg(x) / generator(x) */
    _calcRemainder(msg: Uint8Array) {
        // Work on a copy because we will modify it in‑place
        const buffer = new Uint8Array(msg);
        const gen = this.generator;
        const nSym = this.nSym;

        for (let i = 0; i < msg.length - nSym; i++) {
            const coef = buffer[i];
            if (coef !== 0) {
                // buffer[i + j] ^= gen[j] * coef  (for j = 1..gen.length-1)
                for (let j = 1; j < gen.length; j++) {
                    buffer[i + j] ^= gf.mul(gen[j], coef);
                }
            }
        }
        // The remainder occupies the last nSym positions
        return buffer.subarray(buffer.length - nSym);
    }
}