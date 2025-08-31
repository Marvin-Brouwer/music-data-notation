
export type TokenList = string;

/**
 * Configuration object passed to the `fixedLengthEncoder`.
 */
export type FixedLengthEncoderConfig = {
  /** Desired token length (in symbols). */
  outputLength: number;
  /** Alphabet for base‑N conversion. */
  tokenList: TokenList;
  /** Number of Reed‑Solomon parity symbols. */
  paritySymbolCount: number;
};

/**
 * Result of a successful `encode` operation.
 */
export type EncodedData = {
  /** Human‑readable token (space‑separated symbols with a pipe). */
  symbolArray: string[];
  /** Raw byte slice that was turned into symbols. */
  rawBytes: Uint8Array;
};

/**
 * Result of a successful `decode` operation.
 */
export type DecodedData = {
  /** Bytes recovered from the token (including any padding). */
  recoveredBytes: Uint8Array;
  /** UTF‑8 interpretation of `recoveredBytes`. */
  decodedString: string;
};