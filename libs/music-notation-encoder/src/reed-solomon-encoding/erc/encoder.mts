import poly from "./polynomial.mts";

export function createEncoder(nSym: number) {

    const calcRemainder = poly.createGenerator(nSym);

    /**
     * Encode arbitrary binary data.
     *
     * @param data – Uint8Array containing the raw bytes.
     * @returns Uint8Array containing data + parity (length is a multiple of 255).
     */
    function encode(data: Uint8Array) {
        const blockDataLen = 255 - nSym;
        const blocks: Uint8Array[] = [];

        for (let i = 0; i < data.length; i += blockDataLen) {
            const chunk = data.subarray(i, i + blockDataLen);

            const msg = new Uint8Array(chunk.length + nSym);
            msg.set(chunk);

            const remainder = calcRemainder(msg);
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

    return {
        encode
    }
}