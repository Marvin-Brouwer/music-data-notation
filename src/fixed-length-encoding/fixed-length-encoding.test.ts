import { describe, it, expect } from "vitest";
import { encodeBytes, decodeBytes } from "./fixed-length-encoding.mts"; // adj
import { stringToStream, streamToString } from '../reed-solomon-encoding/erc/test-helpers';

describe("Encoder/Decoder roundtrip", () => {

    const outputLength = 20;
    const shortTokenList = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''); // length 62
    const longTokenList = generateSafeTokenList();

    const shortInput = "hello";
    const longInput = "under 15 chars"; // fits 20 tokens in base62 (≤ 15 characters for safety):

    it("should encode and decode correctly with short tokenList (<256)", () => {

        const inputStream = stringToStream(shortInput);
        const encoded = encodeBytes(inputStream, outputLength, shortTokenList) as string[];

        // output length should be fixed
        expect(encoded.length).toBe(outputLength);

        // all tokens must come from tokenList
        encoded.forEach(t => {
            expect(shortTokenList).toContain(t);
        });

        const decoded = decodeBytes(encoded, shortTokenList);
        expect(streamToString(decoded)).toBe(shortInput);
    });

    it("should encode and decode correctly with long data and short tokenList (<256)", () => {

        const inputStream = stringToStream(longInput);
        const encoded = encodeBytes(inputStream, outputLength, shortTokenList) as string[];

        // output length should be fixed
        expect(encoded.length).toBe(outputLength);

        // all tokens must come from tokenList
        encoded.forEach(t => {
            expect(shortTokenList).toContain(t);
        });
        console.log('TEST', streamToString(inputStream))

        const decoded = decodeBytes(encoded, shortTokenList);
        console.log('TEST', decoded, inputStream)
        expect(streamToString(decoded)).toBe(longInput);
    });

    it("should encode and decode correctly with large tokenList (>=256)", () => {
        // Build tokenList of length 255 (all byte values except one, for example)

        const inputStream = stringToStream(shortInput);
        const encoded = encodeBytes(inputStream, outputLength, longTokenList) as string[];

        expect(encoded.length).toBe(outputLength);

        encoded.forEach(t => {
            expect(longTokenList).toContain(t);
        });

        const decoded = decodeBytes(encoded, longTokenList);
        expect(streamToString(decoded)).toBe(shortInput);
    });

    it("should encode and decode correctly with long input and large tokenList (>=256)", () => {
        // Build tokenList of length 255 (all byte values except one, for example)

        const inputStream = stringToStream(longInput);
        const encoded = encodeBytes(inputStream, outputLength, longTokenList) as string[];

        expect(encoded.length).toBe(outputLength);

        encoded.forEach(t => {
            expect(longTokenList).toContain(t);
        });

        const decoded = decodeBytes(encoded, longTokenList);
        expect(streamToString(decoded)).toBe(longInput);
    });
});


function generateSafeTokenList(): string[] {
  const tokens: string[] = [];

  // 1. Printable ASCII: space (32) → tilde (126)
  for (let i = 32; i <= 126; i++) {
    tokens.push(String.fromCharCode(i));
  }

  // 2. Extended Latin-1: 160 → 255
  for (let i = 160; tokens.length < 255; i++) {
    tokens.push(String.fromCharCode(i));
  }

  return tokens;
}