import { describe, it, expect } from "vitest";
import { fixedLengthEncoder, type FixedLengthEncoderOptions } from "./fixed-length-encoding.mts"; // adj
import { stringToStream, streamToString } from '../reed-solomon-encoding/erc/test-helpers';

describe("Encoder/Decoder roundtrip", () => {

    const outputLength = 20;

    const shortListOptions: FixedLengthEncoderOptions ={
        outputLength,
        tokenList: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') // length 62
    };
    const longListOptions: FixedLengthEncoderOptions = {
        outputLength,
        tokenList: generateSafeTokenList()
    };

    const shortInput = "hello";
    const longInput = "under 15 chars"; // fits 20 tokens in base62 (≤ 15 characters for safety):

    it("should encode and decode correctly with short tokenList (<256)", () => {

        // ARRANGE
        const inputStream = stringToStream(shortInput);
        const sut = fixedLengthEncoder(shortListOptions);

        // ACT
        const encoded = sut.encodeBytes(inputStream) as string[];
        const decoded = sut.decodeBytes(encoded);

        // ASSERT
        // output length should be fixed
        expect(encoded.length).toBe(outputLength);

        // all tokens must come from tokenList
        encoded.forEach(t => {
            expect(shortListOptions.tokenList).toContain(t);
        });

        // check roundtrip value
        expect(streamToString(decoded)).toBe(shortInput);
    });

    it("should encode and decode correctly with long data and short tokenList (<256)", () => {

        // ARRANGE
        const inputStream = stringToStream(longInput);
        const sut = fixedLengthEncoder(shortListOptions);

        // ACT
        const encoded = sut.encodeBytes(inputStream) as string[];
        const decoded = sut.decodeBytes(encoded);

        // ASSERT
        // output length should be fixed
        expect(encoded.length).toBe(outputLength);

        // all tokens must come from tokenList
        encoded.forEach(t => {
            expect(shortListOptions.tokenList).toContain(t);
        });

        // check roundtrip value
        expect(streamToString(decoded)).toBe(longInput);
    });

    it("should encode and decode correctly with large tokenList (>=256)", () => {

        // ARRANGE
        const inputStream = stringToStream(shortInput);
        const sut = fixedLengthEncoder(longListOptions);

        // ACT
        const encoded = sut.encodeBytes(inputStream) as string[];
        const decoded = sut.decodeBytes(encoded);

        // ASSERT
        // output length should be fixed
        expect(encoded.length).toBe(outputLength);

        // all tokens must come from tokenList
        encoded.forEach(t => {
            expect(longListOptions.tokenList).toContain(t);
        });

        // check roundtrip value
        expect(streamToString(decoded)).toBe(shortInput);
    });

    it("should encode and decode correctly with long input and large tokenList (>=256)", () => {

        // ARRANGE
        const inputStream = stringToStream(longInput);
        const sut = fixedLengthEncoder(longListOptions);

        // ACT
        const encoded = sut.encodeBytes(inputStream) as string[];
        const decoded = sut.decodeBytes(encoded);

        // ASSERT
        // output length should be fixed
        expect(encoded.length).toBe(outputLength);

        // all tokens must come from tokenList
        encoded.forEach(t => {
            expect(longListOptions.tokenList).toContain(t);
        });

        // check roundtrip value
        expect(streamToString(decoded)).toBe(longInput);
    });
});

/**
 * Build tokenList of length 255 (all byte values except one, for example)
 */
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