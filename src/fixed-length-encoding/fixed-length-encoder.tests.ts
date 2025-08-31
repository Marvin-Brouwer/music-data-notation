import { describe, test, expect } from 'vitest';
import { fixedLengthEncoder, isDecodedData, isEncodedData } from './fixed-length-encoder.mts';
import type { DecodedData, EncodedData, FixedLengthEncoderConfig } from './fixed-length-encoding.mts';
import { isEncoderError } from '../encoder-error.mts';

const TOKEN_LIST = '123456789abcdefghijklmnopqrstuvwxyz';
const DEFAULT_CONFIGURATION: FixedLengthEncoderConfig = {
  outputLength: 128,
  paritySymbolCount: 16,
  tokenList: TOKEN_LIST
}

const sut = fixedLengthEncoder(DEFAULT_CONFIGURATION); // defaults

sut.encode('hello').then(r => {
  if (isEncoderError(r)) return;
  console.log('token:', r);
  console.log('length:', r.symbolArray.length);
});

describe('fixedLengthEncoder – default configuration', () => {
  // Encoder constructed once for the whole suite (still follows AAA inside each test)
  const sut = fixedLengthEncoder(DEFAULT_CONFIGURATION); // defaults

  test('produces a token with the correct number of parts and pipe position', async () => {
    // ---------- ARRANGE ----------
    const input = 'hello world';

    // ---------- ACT     ----------
    const encodeResult = await sut.encode(input);

    // ---------- ASSERT ----------
    expect(isEncodedData(encodeResult)).toBe(true);
    expect((encodeResult as EncodedData).symbolArray.length)
      .toBe(DEFAULT_CONFIGURATION.outputLength);
  });

  test('round‑trips a token back to a DecodedData object', async () => {
    // ---------- ARRANGE ----------
    const input = 'some random sentence';

    // ---------- ACT ----------
    const encodeResult = await sut.encode(input);
    // TODO rawbytes overload?
    const decodeResult = sut.decode((encodeResult as EncodedData).symbolArray);

    // ---------- ASSERT ----------
    if (!isDecodedData(decodeResult)) console.log('encoderError', decodeResult)
    expect(isDecodedData(decodeResult)).toBe(true);
    expect(typeof (decodeResult as DecodedData).decodedString).toBe('string');
    expect((decodeResult as DecodedData).recoveredBytes.length).toBeGreaterThanOrEqual(34);
  });

  // test('detects parity corruption after encode → decode', async () => {
  //   // ---------- ARRANGE ----------
  //   const input = await sut.encode('integrity test');
  //   const parts = (input as EncodedData).symbolArray;
  //   // Corrupt a symbol before the pipe (any pre‑pipe symbol works)
  //   const corruptIdx = 0;
  //   const original = parts[corruptIdx];
  //   const replacement = original === '1' ? '2' : '1'; // DEFAULT_ALPHABET starts with '1'
  //   parts[corruptIdx] = replacement;

  //   // ---------- ACT ----------
  //   const result = sut.decode(parts);

  //   // ---------- ASSERT ----------
  //   expect(isDecodedData(result)).toBe(false);
  //   expect(isEncoderError(result)).toBe(true);
  // });
});

// /* ------------------------------------------------------------------
//  *  Custom configuration tests (different alphabet, length, parity)
//  * ------------------------------------------------------------------ */
// describe('fixedLengthEncoder – custom configuration', () => {

//   const CUSTOM_TOKEN_LIST = 'ABCDEF'; // bas
//   const sut = fixedLengthEncoder({
//     outputLength: 12,
//     paritySymbolCount: 3,
//     tokenList: CUSTOM_TOKEN_LIST
//   });

//   test('creates a token respecting the custom alphabet and length', async () => {
//     // ---------- ARRANGE ----------
//     const plain = 'custom config test';

//     // ---------- ACT ----------
//     const encodeResult = await sut.encode(plain);

//     // ---------- ASSERT ----------
//     expect(isEncodedData(encodeResult)).toBe(true);
//     expect((encodeResult as EncodedData).symbolArray.length).toBe(12);
//   });

//   test('round‑trips with the custom settings', async () => {
//     // ---------- ARRANGE ----------
//     const input = 'another custom test';

//     // ---------- ACT ----------
//     const encodeResult = await sut.encode(input);
//     // TODO rawbytes overload?
//     const decodeResult = sut.decode((encodeResult as EncodedData).symbolArray);

//     // ---------- ASSERT ----------
//     expect(isDecodedData(decodeResult)).toBe(true);
//     expect(typeof (decodeResult as DecodedData).decodedString).toBe('string');
//     expect((decodeResult as DecodedData).recoveredBytes.length).toBeGreaterThanOrEqual(34);
//   });
// });