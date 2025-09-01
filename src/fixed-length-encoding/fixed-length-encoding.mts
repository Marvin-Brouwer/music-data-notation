import type { EncoderError } from "../encoder-error.mts";
import { packBaseN, unpackBaseN } from "./base-n";
import { FixedLengthEncoderError } from "./fixed-length-encoding.error";

export type FixedLengthEncoderOptions = {
    tokenList: string[],
    outputLength: number
}

export function fixedLengthEncoder(options: FixedLengthEncoderOptions) {
    const { tokenList, outputLength } = options;

    function calcMaxInputLength(inputBytes: Uint8Array) {
        const inputAlphabetSize = calcAlphabetSize(inputBytes)
        const bitsPerToken = Math.log2(tokenList.length);
        const bitsPerChar = Math.log2(inputAlphabetSize);

        return Math.floor((bitsPerToken * outputLength) / bitsPerChar);
    }

    function calcAlphabetSize(bytes: Uint8Array): number {
        const unique = new Set<number>();
        for (const b of bytes) {
            unique.add(b);
        }
        return unique.size;
    }

    function encodeBytes(
        data: Uint8Array,
    ): string[] | EncoderError {

        const maxInputLength = calcMaxInputLength(data)
        if (maxInputLength < data.length) 
            return FixedLengthEncoderError.forPayloadLength(data.length, maxInputLength);

        if (tokenList.length >= 256) {
            // Direct mapping: pad/truncate to outputLength
            const padded = new Uint8Array(outputLength);
            padded.set(data.slice(0, outputLength));
            return Array.from(padded).map(b => tokenList[b]);
        } else {
            // Base-N packing
            return packBaseN(data, tokenList, outputLength);
        }
    }

    function decodeBytes(
        tokens: string[]
    ): Uint8Array {
        if (tokenList.length >= 256) {
            return new Uint8Array(tokens.map(t => tokenList.indexOf(t)));
        } else {
            return unpackBaseN(tokens, tokenList);
        }
    }

    return Object.freeze({
        calcMaxInputLength,
        encodeBytes,
        decodeBytes
    })
}