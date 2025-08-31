import gf from "./gf256.mts";

export class ReedSolomonEncoder {
    private readonly nSym: number;
    private readonly generator: Uint8Array;

    /** nSym defaults to 10 parity symbols if omitted. */
    constructor(nSym: number, generator: Uint8Array) {
        if (nSym <= 0 || nSym % 2 !== 0) {
            throw new Error('nSym must be a positive even integer');
        }
        this.nSym = nSym;
        this.generator = generator;
    }

    /**
     * Encode arbitrary binary data.
     *
     * @param data – Uint8Array containing the raw bytes.
     * @returns Uint8Array containing data + parity (length is a multiple of 255).
     */
    encode(data: Uint8Array): Uint8Array {
        console.log('data', data)
        const msg = new Uint8Array(data.length + this.nSym);
        msg.set(data);                       // copy data into front
        // Append nSym zeroes (already zero‑filled by Uint8Array ctor)
        const remainder = this._calcRemainder(msg);
        // Replace the zero padding with the actual parity bytes
        msg.set(remainder, data.length);
        return msg;
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