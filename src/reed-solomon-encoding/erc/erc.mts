/* --------------------------------------------------------------
   ReedSolomon – 1‑to‑1 port using Uint8Array (TypeScript)
   -------------------------------------------------------------- */

import { ReedSolomonDecoder } from "./erc.decoder.mts";
import { ReedSolomonEncoder } from "./erc.encoder.mts";
import gf from "./gf256.mts";
import poly from "./polynomial.mts";

export class ReedSolomon {

    private readonly encoder: ReedSolomonEncoder;
    private readonly decoder: ReedSolomonDecoder;

    /** nSym defaults to 10 parity symbols if omitted. */
    constructor(nSym: number = 10) {
        if (nSym <= 0 || nSym % 2 !== 0) {
            throw new Error('nSym must be a positive even integer');
        }
        const generator = this._genGeneratorPoly(nSym);
        this.encoder = new ReedSolomonEncoder(nSym, generator);
        this.decoder = new ReedSolomonDecoder(nSym);
    }

    _genGeneratorPoly(nSym: number) {
        let gen = new Uint8Array([1]); // start with 1
        for (let i = 0; i < nSym; i++) {
            // (x - α^{i+1})  → coefficients: [1, α^{i+1}]
            const term = new Uint8Array([1, gf.pow(2, i)]); // α = 2 in GF(256)
            gen = poly.mul(gen, term);
        }
        return gen; // Uint8Array, highest degree first
    }

    /**
     * Encode arbitrary binary data.
     *
     * @param data – Uint8Array containing the raw bytes.
     * @returns Uint8Array containing data + parity (length is a multiple of 255).
     */
    encode(data: Uint8Array): Uint8Array {
        return this.encoder.encode(data);
    }

    /**
     * Decode a block that was produced by {@link encode}.
     *
     * @param data – Uint8Array containing data + parity.
     * @returns Uint8Array containing only the original data bytes.
     */
    decode(data: Uint8Array): Uint8Array {
       return this.decoder.decode(data);
    }
}