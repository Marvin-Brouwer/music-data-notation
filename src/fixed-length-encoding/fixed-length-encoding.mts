import { packBaseN, unpackBaseN } from "./base-n";

function calcMaxInputLength(tokenListLength: number, outputLength: number, inputAlphabetSize: number) {
    const bitsPerToken = Math.log2(tokenListLength);
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

export function encodeBytes(
    data: Uint8Array,
    outputLength: number,
    tokenList: string[]
): string[] {

    // TODO simple lossy zip can be used maybe 
    const maxInputLength = calcMaxInputLength(tokenList.length, outputLength, calcAlphabetSize(data))
    if (maxInputLength < data.length) throw 'todo error here! + test';

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

export function decodeBytes(
    tokens: string[],
    tokenList: string[]
): Uint8Array {
    if (tokenList.length >= 256) {
        return new Uint8Array(tokens.map(t => tokenList.indexOf(t)));
    } else {
        return unpackBaseN(tokens, tokenList);
    }
}
