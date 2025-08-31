/**
 * @file tokenEncoder.ts
 * @description Fixed‑length token encoder / decoder.
 *
 * Public API:
 *
 *   * `DecodedData` – successful decode payload.
 *   * `DecodingError` – error side of the union.
 *   * `DecodeResult = DecodedData | DecodingError`.
 *
 * A type‑guard `isDecodedData` is exported to let callers narrow the union.
 */

import { EncoderError, isEncoderError } from '../encoder-error.mts';
import type { DecodedData, EncodedData, FixedLengthEncoderConfig, TokenList } from './fixed-length-encoding.mts';

import rs from '../reed-solomon-encoding/reed-solomon.mts';
import { sha256 } from 'js-sha256';
import { FixedLengthEncoderError } from './fixed-length-encoder.error.mts';

export type EncodeResult = EncodedData | EncoderError;
export type DecodeResult = DecodedData | EncoderError;

/**
 * Type guard that narrows a {@link EncodeResult} to {@link EncodedData}.
 *
 * @param result Result of {@link decode}.
 * @returns `true` if `result` is a {@link DecodedData} object.
 */
export function isEncodedData(result: EncodeResult): result is EncodedData {
  return !isEncoderError(result);
}
/**
 * Type guard that narrows a {@link DecodeResult} to {@link DecodedData}.
 *
 * @param result Result of {@link decode}.
 * @returns `true` if `result` is a {@link DecodedData} object.
 */
export function isDecodedData(result: DecodeResult): result is DecodedData {
  return !isEncoderError(result);
}

/* ------------------------------------------------------------------
 *  Helpers – base‑N conversion
 * ------------------------------------------------------------------ */

/**
 * Convert a byte array to an array of symbols using the supplied alphabet.
 *
 * @param data     Byte array to encode.
 * @param tokenList TokenList to map numeric values onto.
 * @returns Symbol array (most‑significant symbol first).
 */
function toBaseNArray(
  data: Uint8Array,
  tokenList: TokenList
): string[] {
  const base = BigInt(tokenList.length);
  let numericValue = BigInt(0);
  for (const byte of data) {
    numericValue = (numericValue << BigInt(8)) + BigInt(byte);
  }
  if (numericValue === BigInt(0)) return [tokenList[0]];
  const symbols: string[] = [];
  while (numericValue > 0) {
    const index = Number(numericValue % base);
    symbols.unshift(tokenList[index]);
    numericValue = numericValue / base;
  }
  return symbols;
}

/**
 * Convert an array of symbols back to a byte array.
 *
 * Errors (e.g., unknown symbols) are returned as a {@link DecodingError}.
 *
 * @param symbols          Symbol array to decode.
 * @param tokenList         Alphabet that was used for encoding.
 * @param targetByteLength Optional length to pad/truncate the result to.
 * @returns Either the decoded `Uint8Array` or a {@link DecodingError}.
 */
function fromBaseNArray(
  symbols: string[],
  tokenList: TokenList,
  targetByteLength?: number
): Uint8Array | EncoderError {
  const base = BigInt(tokenList.length);
  const charToValue = new Map<string, number>();
  for (let i = 0; i < tokenList.length; ++i) charToValue.set(tokenList[i], i);

  let numericValue = BigInt(0);
  for (const symbol of symbols) {
    const value = charToValue.get(symbol);
    if (value === undefined) return FixedLengthEncoderError.forUnknownSymbol(symbol, tokenList);

    numericValue = numericValue * base + BigInt(value);
  }

  const bytes: number[] = [];
  while (numericValue > 0) {
    bytes.unshift(Number(numericValue & BigInt(0xff)));
    numericValue >>= BigInt(8);
  }

  if (targetByteLength !== undefined) {
    if (bytes.length > targetByteLength) {
      // Trim most‑significant excess bytes
      bytes.splice(0, bytes.length - targetByteLength);
    } else if (bytes.length < targetByteLength) {
      // Pad with leading zeros
      const padding = new Array(targetByteLength - bytes.length).fill(0);
      bytes.unshift(...padding);
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Build a token encoder / decoder with the supplied configuration.
 *
 * @param config Configuration options (output length, alphabet, parity).
 * @returns An object exposing `encode` (async) and `decode` (sync) methods.
 */
export function fixedLengthEncoder(config: FixedLengthEncoderConfig) {

  const {outputLength, tokenList, paritySymbolCount } = config;

  /**
   * Encode a plain‑text string into a fixed‑length token.
   *
   * @param data Input string.
   * @returns Promise that resolves to an {@link EncodeResult}.
   */
  async function encode(data: string): Promise<EncodeResult> {

    const hashBytes = new Uint8Array(sha256.arrayBuffer(data));

    // 2️⃣  Append parity using functional RS helper
    const rsBlock = rs.encode(hashBytes, outputLength, paritySymbolCount); // length = 32 + paritySymbolCount
    if (isEncoderError(rsBlock)) return rsBlock;

    // 3️⃣  Determine how many bytes we need to produce exactly `outputLength` symbols
    const bitsPerSymbol = Math.log2(tokenList.length);
    const neededByteCount = Math.ceil(((outputLength -1) * bitsPerSymbol) / 8);
    const truncatedSlice = rsBlock.slice(0, neededByteCount); // deterministic truncation

    function getSymbolArray() {
        let symbolArray = toBaseNArray(truncatedSlice, tokenList);
        if (symbolArray.length < outputLength) {
            const padding = new Array(outputLength - symbolArray.length).fill(tokenList[0]);
            symbolArray = [...padding, ...symbolArray];
        }
        return symbolArray;
    }

    return Object.assign({ }, {
      get symbolArray() { return getSymbolArray() },
      rawBytes: truncatedSlice,
    });
  }

  /**
   * Decode a token (or an already split array of parts) back to its payload.
   *
   * The function never throws; it returns a {@link DecodeResult}.
   *
   * @param tokens pre‑split array of parts.
   * @returns Either a {@link DecodedData} object or a {@link DecodingError}.
   */
  function decode(tokens: string[]): DecodeResult {

    if (tokens.length <= (paritySymbolCount * 2)) 
      return FixedLengthEncoderError.forLessThanParityLength(tokens.length, paritySymbolCount);

    // 3️⃣  Symbol‑count sanity check
    if (tokens.length !== outputLength) 
      return FixedLengthEncoderError.forLessThanOutputLength(tokens.length, paritySymbolCount);

    // 4️⃣  Convert symbols back to bytes
    const bitsPerSymbol = Math.log2(tokenList.length);
    const neededByteCount = Math.ceil((outputLength * bitsPerSymbol) / 8);
    const recoveredBytes = fromBaseNArray(tokens, tokenList, neededByteCount);
    if (isEncoderError(recoveredBytes)) return recoveredBytes;

    // 5️⃣  Reed‑Solomon verification (needs full block)
    const fullBlockLength = 32 + paritySymbolCount; // 32‑byte hash + parity
    if (recoveredBytes.length < fullBlockLength) 
      return FixedLengthEncoderError.forInsufficientBytes(tokens.length, paritySymbolCount);

    const rsVerificationResult = rs.decode(
      recoveredBytes.slice(0, fullBlockLength),
      32,
      paritySymbolCount
    );
    if (isEncoderError(rsVerificationResult)) return rsVerificationResult;

    function decodeString() {
        const textDecoder = new TextDecoder();
        return textDecoder.decode(recoveredBytes as Uint8Array);
    }

    return Object.assign({ }, {
      recoveredBytes,
      get decodedString() { return decodeString(); },
    });
  }

  return {
    encode,
    decode,
  };
}