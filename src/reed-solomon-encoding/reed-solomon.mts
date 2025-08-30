/**
 * Wrapper around the MIT‑licensed `erc-js` Reed‑Solomon implementation.
 *
 * Exported as a default object `{ encode, decode }` so callers can
 * `import rs from './reed-solomon'`.
 *
 * Both functions **return** either the expected Uint8Array **or**
 * a `DecodingError` instance – they never throw.
 * 
 * @module 'rs'
 */

import ReedSolomon from './erc/erc.mts';
import { ReedSolomonEncoderError } from './reed-solomon.error.mts';
import type { EncoderError } from '../encoder-error.mjs';

/**
 * Encode a payload with Reed‑Solomon parity.
 *
 * @param payload      Raw data to protect.
 * @param parityBytes  Number of parity symbols to append (must be > 0).
 * @returns Uint8Array on success, otherwise a DecodingError.
 */
function encode(
  payload: Uint8Array,
  parityBytes: number
): Uint8Array | EncoderError {
  if (parityBytes <= 0) return ReedSolomonEncoderError.forIncorrectParityBytes();

  try {

    const totalCodewordLength = payload.length + parityBytes;
    const reedSolomonEncoder = new ReedSolomon(totalCodewordLength);
    return reedSolomonEncoder.encode(payload);
  } catch (e) {
    return ReedSolomonEncoderError.forEncodingError(e)
  }
}

/**
 * Decode a block that contains payload + parity.
 *
 * @param block          Uint8Array of length payloadLength + parityBytes.
 * @param payloadLength  Expected length of the original payload.
 * @param parityBytes    Number of parity symbols that were added.
 * @returns Uint8Array on success, otherwise a DecodingError.
 */
function decode(
  block: Uint8Array,
  payloadLength: number,
  parityBytes: number
): Uint8Array | EncoderError {

  const totalCodewordLength = payloadLength + parityBytes;
  if (block.length !== totalCodewordLength) 
    return ReedSolomonEncoderError.forBlockLengthMismatch(block.length, totalCodewordLength);

  try {

    const reedSolomonDecoder = new ReedSolomon(totalCodewordLength);
    return reedSolomonDecoder.decode(block); 
  } catch (e) {
    return ReedSolomonEncoderError.forDecodingError(e);
  }
}

export default { encode, decode };