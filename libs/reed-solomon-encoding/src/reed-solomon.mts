// src/reed-solomon-encoding/reed-solomon.mts
// ---------------------------------------------------------------
// Functional Reed‑Solomon wrapper (ERC‑JS based)
// ---------------------------------------------------------------

import { createDecoder } from './erc/decoder.mts';
import { createEncoder } from './erc/encoder.mts';
import { ReedSolomonEncoderError } from './reed-solomon.error.mts';

export type ReedSolomonEncodingOptions = {

  blockLength: number,
  parityBytes: number
}

export function createEncoding(options: ReedSolomonEncodingOptions) {

  const { blockLength, parityBytes } = options;

  const encoder = createEncoder(blockLength);
  const decoder = createDecoder(blockLength);

  /**
   * Encode a payload with Reed‑Solomon error‑correction.
   *
   * @param payload      Uint8Array containing the *raw* data you want to protect.
   * @param totalLength  Desired total block size (payload + parity). Must be ≤ 255.
   * @param parityBytes  Number of parity symbols to append. Must be > 0 and
   *                     satisfy `payload.length + parityBytes === totalLength`.
   * @returns            Uint8Array of length `totalLength` (payload + parity).
   *
   * @throws DecodingError  if any argument is illegal or the underlying codec fails.
   */
  function encode(
    payload: Uint8Array
  ): Uint8Array | Error {

    if (payload.length <= parityBytes)
      return ReedSolomonEncoderError.forTotalLength();
    if (blockLength <= parityBytes)
      return ReedSolomonEncoderError.forIncorrectBlockSize();
    if (parityBytes <= 0)
      return ReedSolomonEncoderError.forIncorrectParityBytes();
    const minimumBlockLength = payload.length + parityBytes;
    // if (blockLength < minimumBlockLength)
      // return ReedSolomonEncoderError.forBlockLengthMismatch(blockLength, minimumBlockLength);

    // ---------- encode ----------
    try {
      return encoder.encode(payload);
    } catch (e) {
      return ReedSolomonEncoderError.forEncodingError(e);
    }
  }

  /**
   * Decode a Reed‑Solomon block back to the original payload.
   *
   * @param block        Uint8Array that was produced by `encode`. Its length must be `totalLength`.
   * @param blockLength  The total block size that was used during encoding.
   * @param parityBytes  Number of parity symbols that were added during encoding.
   * @returns            Uint8Array containing the original payload (length = totalLength - parityBytes).
   *
   * @throws DecodingError  if the block size is wrong, if the wrapper has never been
   *                        properly initialized, or if the error‑correction limit is exceeded.
   */
  function decode(
    block: Uint8Array
  ): Uint8Array | Error {

    if (blockLength <= 0 || blockLength > 255)
      return ReedSolomonEncoderError.forIncorrectBlockSize();
    if (parityBytes <= 0)
      return ReedSolomonEncoderError.forIncorrectParityBytes();

    // ---------- decode ----------
    try {
      return decoder.decode(block);
    } catch (e) {
      return ReedSolomonEncoderError.forDecodingError(e);
    }
  }

  return {
    encode, decode
  };
}