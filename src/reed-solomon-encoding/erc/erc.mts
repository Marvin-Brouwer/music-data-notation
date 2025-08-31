/* --------------------------------------------------------------
   ReedSolomon – 1‑to‑1 port using Uint8Array (TypeScript)
   -------------------------------------------------------------- */

import { ReedSolomonDecoder } from "./erc.decoder.mts";
import { ReedSolomonEncoder } from "./erc.encoder.mts";

export class ReedSolomon {

    private readonly encoder: ReedSolomonEncoder;
    private readonly decoder: ReedSolomonDecoder;

    /** nSym defaults to 10 parity symbols if omitted. */
    constructor(nSym: number = 10) {
        if (nSym <= 0 || nSym % 2 !== 0) {
            throw new Error('nSym must be a positive even integer');
        }
        this.encoder = new ReedSolomonEncoder(nSym);
        this.decoder = new ReedSolomonDecoder(nSym);
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
        const blockLen = 255;
        const blocks: Uint8Array[] = [];

        for (let i = 0; i < data.length; i += blockLen) {
            const block = data.subarray(i, i + blockLen);
            blocks.push(this.decoder.decode(block));
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

}