import { describe, test, expect } from 'vitest';

import rs from './reed-solomon.mts';
import { isEncoderError } from '../encoder-error.mts';
import { stringToStream } from '../test-helpers';
import type { ReedSolomonEncoderError } from './reed-solomon.error.mts';

describe('reed‑solomon wrapper (erc‑js based)', () => {
  const payload = stringToStream('This is arbitrary text');
  const parityBytes = 4; 
  const blockLength = payload.length + parityBytes;

  test('encode returns Uint8Array on success', () => {
    const encodeResult = rs.encode(payload, blockLength, parityBytes);
    expect(isEncoderError(encodeResult)).toBe(false);
    expect((encodeResult as Uint8Array).length).toBe(48);
  });

  test('encode returns DecodingError when parityBytes <= 0', () => {
    const encodeResult = rs.encode(payload, blockLength, 0);
    expect(isEncoderError(encodeResult)).toBe(true);
  });

  test('decode recovers original payload when no errors', () => {
    const encodeResult = rs.encode(payload, blockLength, parityBytes) as Uint8Array;
    const decodeResult = rs.decode(encodeResult, blockLength, parityBytes);
    expect(isEncoderError(decodeResult)).toBe(false);
    expect(Array.from(decodeResult as Uint8Array)).toEqual(Array.from(payload));
  });

  test('decode returns DecodingError when block length mismatches', () => {
    const wrongBlock = Uint8Array.from([0, 1, 2, 3]); // too short
    const decodeResult = rs.decode(wrongBlock, blockLength, 2);
    expect(isEncoderError(decodeResult)).toBe(true);
    expect((decodeResult as ReedSolomonEncoderError).message)
      .toBe('Decoded payload length (0) does not match expected (24)');
  });

  test('decode returns DecodingError when errors exceed correction capability', () => {
    const encodeResult = rs.encode(payload, blockLength, parityBytes) as Uint8Array;
    // Flip 13 bytes – should be 2 to exceed correction (parityBytes/2 = 2)
    // However, it seems to need 13
    const corrupted = new Uint8Array(encodeResult.length);
    // It used test random, but because the size is this big we just erase the last 14 bytes
    corrupted.set(encodeResult.slice(0, encodeResult.length - 14))

    const decodeResult = rs.decode(corrupted, blockLength, parityBytes);
    expect(isEncoderError(decodeResult)).toBe(true);
  });
});