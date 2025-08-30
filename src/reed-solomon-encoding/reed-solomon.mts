// src/reed-solomon-encoding/reed-solomon.mts
// ---------------------------------------------------------------
// Functional Reed‑Solomon wrapper (ERC‑JS based)
// ---------------------------------------------------------------

import type { EncoderError } from '../encoder-error.mts';
import ReedSolomon from './erc/erc.mjs';
import { ReedSolomonEncoderError } from './reed-solomon.error.mts';

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
export function encode(
  payload: Uint8Array,
  totalLength: number,
  parityBytes: number
): Uint8Array | EncoderError {
  
  if (totalLength <= 0 || totalLength > 255) 
    return ReedSolomonEncoderError.forTotalLength();
  if (parityBytes <= 0)  
    return ReedSolomonEncoderError.forIncorrectParityBytes();
  if (payload.length + parityBytes !== totalLength)
    return ReedSolomonEncoderError.forBlockLengthMismatch(payload.length + parityBytes, totalLength);

  // ---------- create a fresh codec instance ----------
  // The ERC‑JS constructor expects the *total* block length.
  const rs = new ReedSolomon(totalLength);

  // ---------- encode ----------
  try {
    return rs.encode(payload);
  } catch (e) {
    return ReedSolomonEncoderError.forEncodingError(e);
  }
}

/**
 * Decode a Reed‑Solomon block back to the original payload.
 *
 * @param block        Uint8Array that was produced by `encode`. Its length must be `totalLength`.
 * @param totalLength  The total block size that was used during encoding.
 * @param parityBytes  Number of parity symbols that were added during encoding.
 * @returns            Uint8Array containing the original payload (length = totalLength - parityBytes).
 *
 * @throws DecodingError  if the block size is wrong, if the wrapper has never been
 *                        properly initialised, or if the error‑correction limit is exceeded.
 */
export function decode(
  block: Uint8Array,
  totalLength: number,
  parityBytes: number
): Uint8Array | EncoderError {

  if (totalLength <= 0 || totalLength > 255) 
    return ReedSolomonEncoderError.forTotalLength();
  if (parityBytes <= 0)  
    return ReedSolomonEncoderError.forIncorrectParityBytes();
  if (block.length !== totalLength)
    return ReedSolomonEncoderError.forBlockLengthMismatch(block.length, totalLength);

  // ---------- create a fresh codec instance ----------
  const rs = new ReedSolomon(totalLength);

  // ---------- decode ----------
  try {
    // `rs.decode` already strips the parity bytes and returns only the data part.
    const payload = rs.decode(block);
    // As a safety net, ensure the payload length matches what we expect.
    const expectedPayloadLen = totalLength - parityBytes;
    if (payload.length !== expectedPayloadLen) {
    return ReedSolomonEncoderError.forPayloadLengthMismatch(payload.length, expectedPayloadLen);
    }
    return payload;
  } catch (e) {
    return ReedSolomonEncoderError.forDecodingError(e);
  }
}

export default {
  encode, decode
};