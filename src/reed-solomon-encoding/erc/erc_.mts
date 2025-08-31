
/* ------------------------------------------------------------------
 *  Small utilities – kept out of the main encode/decode bodies
 * ---------------------------------------------------------------- */

import { berlekampMassey } from "./berlekamp-massey.mts";
import { forneyAlgorithm } from "./forney.mts";
import gf from "./gf256.mts";

/**
 * Compute the syndromes S₁ … S_{nSym}.
 *
 * @param gf        GF256 instance
 * @param block     Received block (data + parity)
 * @param nSym      Number of parity symbols
 * @returns Uint8Array of length nSym containing the syndromes
 */
function computeSyndromes(block: Uint8Array, nSym: number): Uint8Array {
  const synd = new Uint8Array(nSym);
  for (let i = 0; i < nSym; i++) {
    const evalPt = gf.exp(i + 1); // α^{i+1}
    let acc = 0;
    for (let j = 0; j < block.length; j++) {
      // block[j] * (evalPt ^ j)
      const term = gf.mul(block[j], gf.pow(evalPt, j));
      acc = gf.add(acc, term);
    }
    synd[i] = acc;
  }
  return synd;
}

/**
 * Locate error positions using a Chien search.
 *
 * @param gf        GF256 instance
 * @param lambda    Error‑locator polynomial (coefficients, low‑degree first)
 * @param n         Block length (data + parity)
 * @returns array of error positions (indices counted from the left, 0‑based)
 */
function locateErrors(lambda: Uint8Array, n: number): number[] {
  const errPos: number[] = [];

  // λ(x) = Σ λ_i x^i .  We evaluate λ(α^{-i}) for i = 0 … n‑1.
  for (let i = 0; i < n; i++) {
    const evalPt = gf.exp(255 - i); // α^{‑i} == α^{255‑i} because α^{255}=1
    let sum = 0;
    for (let j = 0; j < lambda.length; j++) {
      const term = gf.mul(lambda[j], gf.pow(evalPt, j));
      sum = gf.add(sum, term);
    }
    if (sum === 0) {
      // Position i (from the left) is erroneous.
      errPos.push(i);
    }
  }
  return errPos;
}

/**
 * Apply Forney’s algorithm to correct the block in‑place.
 *
 * @param gf            GF256 instance
 * @param block         Received block (will be mutated)
 * @param syndromes     Syndromes S₁…S_{nSym}
 * @param lambda        Error‑locator polynomial
 * @param errPos        Error positions (as returned by locateErrors)
 */
function correctErrors(
  block: Uint8Array,
  syndromes: Uint8Array,
  lambda: Uint8Array,
  errPos: number[]
): void {
  // Forney expects the error‑locator polynomial *without* the leading 1.
  // The helper we imported works with that convention.
  const errorValues = forneyAlgorithm(syndromes, lambda, errPos);

  // Apply the corrections.
  for (let i = 0; i < errPos.length; i++) {
    const pos = errPos[i];
    block[pos] = gf.add(block[pos], errorValues[i]); // subtraction == addition in GF(256)
  }
}

/**
 * Generate parity bytes for a systematic RS code.
 *
 * This follows the classic “polynomial division” approach:
 *   – Treat the message as a polynomial M(x).
 *   – Multiply by x^{nSym} (i.e. shift left by nSym symbols).
 *   – Divide by the generator g(x) = (x‑α¹)…(x‑α^{nSym}).
 *   – The remainder R(x) are the parity symbols.
 *
 * @param gf            GF256 instance
 * @param data          Payload (Uint8Array)
 * @param nSym          Number of parity symbols
 * @returns Uint8Array of length nSym containing the parity bytes
 */
function generateParity(data: Uint8Array, nSym: number): Uint8Array {
  // Work on a temporary buffer that is `data.length + nSym` long.
  const tmp = new Uint8Array(data.length + nSym);
  tmp.set(data, 0); // lower part = message, upper part = zeros (placeholder for remainder)

  // Synthetic division by the generator polynomial.
  for (let i = 0; i < data.length; i++) {
    const coef = tmp[i];
    if (coef === 0) continue; // nothing to propagate

    // Multiply the coefficient by each root α^{j} (j = 1 … nSym)
    for (let j = 1; j <= nSym; j++) {
      const idx = i + j;
      const term = gf.mul(coef, gf.exp(j));
      tmp[idx] ^= term; // XOR == addition in GF(256)
    }
  }

  // The last `nSym` bytes now hold the remainder → the parity.
  return tmp.subarray(data.length);
}

/* ------------------------------------------------------------------
 *  ReedSolomon class – public API
 * ---------------------------------------------------------------- */

export default class ReedSolomon {
  /** Max block size for GF(256) */
  private static readonly MAX_BLOCK = 255;

  /** Total length of a code word (data + parity) */
  private readonly n: number;

  /** Number of parity symbols – determined on first encode */
  private nSym: number = 0;

  /**
   * @param totalLength – total block size (must be ≤ 255)
   */
  constructor(totalLength: number) {
    if (
      typeof totalLength !== "number" ||
      totalLength <= 0 ||
      totalLength > ReedSolomon.MAX_BLOCK
    ) {
      throw new Error(
        `totalLength must be a positive integer ≤ ${ReedSolomon.MAX_BLOCK}`
      );
    }
    this.n = totalLength;
  }

  /**
   * Encode a payload into a systematic RS block.
   *
   * @param data Uint8Array containing the raw payload.
   * @returns Uint8Array of length `totalLength` (payload + parity).
   * @throws Error on invalid arguments.
   */
  encode(data: Uint8Array): Uint8Array {
    if (!(data instanceof Uint8Array)) {
      throw new Error("Input data must be a Uint8Array");
    }
    if (data.length >= this.n) {
      throw new Error(
        `Payload too large – must be shorter than totalLength (${this.n})`
      );
    }

    const parityBytes = this.n - data.length;
    if (parityBytes <= 0) {
      throw new Error("Parity size must be > 0");
    }

    // Remember the parity size for later decode calls (mirrors original behaviour)
    this.nSym = parityBytes;

    // Compute parity using the helper that performs synthetic division.
    const parity = generateParity(data, parityBytes);

    // Assemble final block: data followed by parity.
    const block = new Uint8Array(this.n);
    block.set(data, 0);
    block.set(parity, data.length);
    return block;
  }

  /**
   * Decode a received block and recover the original payload.
   *
   * @param block Uint8Array of length `totalLength`.
   * @returns Uint8Array containing the original payload.
   * @throws Error if the block is malformed or unrecoverable.
   */
  decode(block: Uint8Array): Uint8Array {
    if (!(block instanceof Uint8Array)) {
      throw new Error("Block must be a Uint8Array");
    }
    if (block.length !== this.n) {
      throw new Error(
        `Block length (${block.length}) does not match expected totalLength (${this.n})`
      );
    }
    if (this.nSym <= 0) {
      throw new Error(
        "Parity size unknown – call encode() first or construct with explicit parity"
      );
    }

    const parityBytes = this.nSym;
    const dataLen = this.n - parityBytes;

    // 1️⃣ Compute syndromes.
    const syndromes = computeSyndromes(block, parityBytes);
    const hasError = syndromes.some((v) => v !== 0);

    // If no syndromes are non‑zero, the block is clean.
    if (!hasError) {
      return block.subarray(0, dataLen);
    }

    // 2️⃣ Berlekamp‑Massey → error‑locator polynomial λ(x).
    const lambda = berlekampMassey(syndromes);

    // 3️⃣ Locate error positions (Chien search).
    const errPos = locateErrors(lambda, this.n);
    if (errPos.length === 0) {
      throw new Error("Unable to locate errors – block may be beyond correction capacity");
    }

    // 4️⃣ Correct the errors using Forney.
    correctErrors(block, syndromes, lambda, errPos);

    // 5️⃣ Verify that correction succeeded (re‑compute syndromes).
    const postSynd = computeSyndromes(block, parityBytes);
    if (postSynd.some((v) => v !== 0)) {
      throw new Error("Unrecoverable errors remain after correction");
    }

    // Return the original payload (strip parity).
    return block.subarray(0, dataLen);
  }
}