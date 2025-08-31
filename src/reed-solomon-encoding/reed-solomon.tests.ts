import { describe, test, expect } from 'vitest';

import rs from './reed-solomon.mts';
import { isEncoderError } from '../encoder-error.mts';
import { stringToStream } from './erc/test-helpers';

describe('reed‑solomon wrapper (erc‑js based)', () => {
  const payload = stringToStream('bb');
  const parityBytes = 4; // can correct up to 2 symbol errors

  test('encode returns Uint8Array on success', () => {
    const encodeResult = rs.encode(payload, 8, parityBytes);
    expect(isEncoderError(encodeResult)).toBe(false);
    expect((encodeResult as Uint8Array).length).toBe(payload.length + parityBytes);
  });

  test('encode returns DecodingError when parityBytes <= 0', () => {
    const encodeResult = rs.encode(payload, 8, 0);
    expect(isEncoderError(encodeResult)).toBe(true);
  });

  test('decode recovers original payload when no errors', () => {
    const encodeResult = rs.encode(payload, 8, parityBytes);
    console.log(encodeResult)
    const decodeResult = rs.decode(encodeResult as Uint8Array, parityBytes);
    console.log(decodeResult)
    expect(isEncoderError(decodeResult)).toBe(false);
    expect(Array.from(decodeResult as Uint8Array)).toEqual(Array.from(payload));
  });

  test('decode returns DecodingError when block length mismatches', () => {
    const wrongBlock = Uint8Array.from([0, 1, 2, 3]); // too short
    const decodeResult = rs.decode(wrongBlock, 2);
    expect(isEncoderError(decodeResult)).toBe(true);
  });

  test('decode returns DecodingError when errors exceed correction capability', () => {
    const encodeResult = rs.encode(payload, 8, parityBytes) as Uint8Array;
    // Flip three bytes – exceeds correction (parityBytes/2 = 2)
    const corrupted = Uint8Array.from(encodeResult);
    corrupted[0] ^= 0xff;
    corrupted[1] ^= 0xaa;
    corrupted[2] ^= 0x55;

    const decodeResult = rs.decode(corrupted, parityBytes);
    expect(isEncoderError(decodeResult)).toBe(true);
  });
});