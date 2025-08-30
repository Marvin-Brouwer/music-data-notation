import { berlekampMassey } from "./berlekamp-massey.mts";
import { forneyAlgorithm } from "./forney.mts";
import { EXP_TABLE, gfMul } from "./gf256.mts";

/**
 * Minimal Reed‑Solomon codec (compatible with the historic `erc-js` API).
 *
 * The implementation follows the classic “generator‑polynomial” construction
 * over GF(256) with the primitive polynomial `x⁸ + x⁴ + x³ + x² + 1`
 * (0x11d).  It supports any codeword length `n` up to 255 bytes.
 *
 * @example
 * ```ts
 * import ReedSolomon from './rs/erc-js';
 *
 * const n = 255;                     // total symbols (data + parity)
 * const rs = new ReedSolomon(n);
 *
 * const data = Uint8Array.from([1, 2, 3, 4, 5]); // ← k = n - parityBytes
 * const encoded = rs.encode(data);               // length === n
 *
 * // Corrupt up to floor(parityBytes/2) symbols …
 * encoded[10] ^= 0xff;
 *
 * const recovered = rs.decode(encoded); // → Uint8Array([1,2,3,4,5])
 * ```
 *
 * @public
 */
export default class ReedSolomon {
  /** Total length of a codeword (data + parity). Must be ≤ 255. */
  private readonly n: number;

  /** Number of parity symbols (`n - k`). Determined from the first `encode` call. */
  private parityBytes!: number;

  /** Generator polynomial for the current `parityBytes`. Cached after first use. */
  private generatorPoly!: Uint8Array;

  /**
   * Create a codec for a fixed codeword length.
   *
   * @param n Total number of symbols (data + parity). Must satisfy `1 ≤ n ≤ 255`.
   * @throws If `n` is outside the supported range.
   */
  constructor(n: number) {
    if (n <= 0 || n > 255) {
      throw new Error(
        'ReedSolomon: codeword length must be between 1 and 255'
      );
    }
    this.n = n;
  }

  /* ------------------------------------------------------------------
   * PUBLIC API
   * ------------------------------------------------------------------ */

  /**
   * Encode a data block, appending parity symbols.
   *
   * @param data Uint8Array containing the raw payload.
   * @returns Uint8Array of length `n` (payload followed by parity bytes).
   *
   * @throws If `data.length` is larger than the allowed data portion
   *         (`n - parityBytes`). The first call determines `parityBytes`
   *         implicitly: `parityBytes = n - data.length`. Subsequent calls
   *         must use the same `parityBytes` size, otherwise an error is thrown.
   */
  encode(data: Uint8Array): Uint8Array {
    // Determine parity size on first call.
    if (this.parityBytes === undefined) {
      const parity = this.n - data.length;
      if (parity <= 0) {
        throw new Error(
          `ReedSolomon.encode: data length (${data.length}) exceeds codeword length (${this.n})`
        );
      }
      this.parityBytes = parity;
      this.generatorPoly = this.buildGenerator(this.parityBytes);
    } else {
      // Subsequent calls must respect the same parity size.
      if (data.length !== this.n - this.parityBytes) {
        throw new Error(
          `ReedSolomon.encode: expected data length ${this.n -
            this.parityBytes}, got ${data.length}`
        );
      }
    }

    // Append `parityBytes` zeroes to the message (big‑endian representation).
    const msgPoly = new Uint8Array(this.n);
    msgPoly.set(data, 0); // data occupies the high‑order part

    // Compute remainder = msgPoly mod generatorPoly.
    const remainder = this.modulo(msgPoly);

    // Copy remainder into the parity region (the last `parityBytes` bytes).
    msgPoly.set(remainder, this.n - this.parityBytes);

    return msgPoly;
  }

  /**
   * Decode a codeword (payload + parity) and correct errors if possible.
   *
   * @param block Uint8Array of length `n`.
   * @returns Uint8Array containing only the original data part
   *          (length `n - parityBytes`).
   *
   * @throws If the block length does not equal `n`.  
   * @throws If the number of detected errors exceeds the correction
   *         capability (`⌊parityBytes/2⌋`). In that case the underlying
   *         algorithm throws, and the caller can convert the exception
   *         into a `DecodingError` (your wrapper already does that).
   */
  decode(block: Uint8Array): Uint8Array {
    if (block.length !== this.n) {
      throw new Error(
        `ReedSolomon.decode: expected block length ${this.n}, got ${block.length}`
      );
    }

    // If parityBytes hasn't been set yet (e.g., you called decode before encode),
    // infer it from the block: assume the maximum possible parity (n/2) and
    // adjust later when the syndrome indicates the true count.
    if (this.parityBytes === undefined) {
      // Conservative guess – we will recompute the exact parity after syndrome.
      this.parityBytes = Math.floor(this.n / 2);
      this.generatorPoly = this.buildGenerator(this.parityBytes);
    }

    // Compute syndromes.
    const syndromes = this.computeSyndromes(block);
    const allZero = syndromes.every((s) => s === 0);
    if (allZero) {
      // No errors – just strip the parity.
      return block.subarray(0, this.n - this.parityBytes);
    }

    // Use the Berlekamp‑Massey algorithm to find the error‑locator polynomial.
    const sigma = berlekampMassey(syndromes);

    // Find error locations (Chien search).
    const errorPositions = this.findErrorLocations(sigma);

    if (errorPositions.length > Math.floor(this.parityBytes / 2)) {
      throw new Error(
        `ReedSolomon.decode: too many errors (${errorPositions.length}) – cannot correct`
      );
    }

    // Compute error magnitudes (Forney algorithm).
    const errorMagnitudes = forneyAlgorithm(
      syndromes,
      sigma,
      errorPositions
    );

    // Correct the errors in a copy of the block.
    const corrected = Uint8Array.from(block);
    for (let i = 0; i < errorPositions.length; i++) {
      const pos = errorPositions[i];
      corrected[pos] ^= errorMagnitudes[i];
    }

    // Return the data portion (strip parity).
    return corrected.subarray(0, this.n - this.parityBytes);
  }

  /* ------------------------------------------------------------------
   * PRIVATE HELPERS
   * ------------------------------------------------------------------ */

  /**
   * Build the generator polynomial (x + α¹)(x + α²)…(x + α^parity).
   *
   * The result is a big‑endian coefficient array of length `parity + 1`.
   */
  private buildGenerator(parity: number): Uint8Array {

    // Start with (x + α¹) → coefficients [1, 1] (α¹ == 1)
    let gen = Uint8Array.of(1, 1);

    for (let i = 2; i <= parity; i++) {
      // Multiply current generator by (x + α^i)
      const next = new Uint8Array(gen.length + 1);
      // Shift left (multiply by x)
      for (let j = 0; j < gen.length; j++) {
        next[j] ^= gen[j]; // coefficient of x^{k+1}
      }
      // Add α^i * gen
      const factor = EXP_TABLE[i]; // α^i
      for (let j = 0; j < gen.length; j++) {
        next[j + 1] ^= gfMul(gen[j], factor);
      }
      gen = next;
    }
    return gen;
  }

  /**
   * Compute `msgPoly mod generatorPoly`.  Both arguments are big‑endian.
   */
  private modulo(msgPoly: Uint8Array): Uint8Array {
    const gen = this.generatorPoly;
    const remainder = Uint8Array.from(msgPoly); // copy
    const genDegree = gen.length - 1;

    for (let i = 0; i <= remainder.length - gen.length; i++) {
      const coef = remainder[i];
      if (coef === 0) continue;
      for (let j = 1; j < gen.length; j++) {
        if (gen[j] !== 0) {
          remainder[i + j] ^= gfMul(gen[j], coef);
        }
      }
    }
    // Return the low‑order part (the actual parity bytes).
    return remainder.subarray(remainder.length - genDegree);
  }

  /**
   * Compute the syndrome vector S₁…S_{parityBytes}.
   *
   * Each syndrome is the evaluation of the received polynomial at α^i.
   */
  private computeSyndromes(block: Uint8Array): Uint8Array {
    const synd = new Uint8Array(this.parityBytes);

    for (let i = 0; i < this.parityBytes; i++) {
      const evalPoint = EXP_TABLE[i + 1]; // α^{i+1}
      let sum = 0;
      for (let j = 0; j < block.length; j++) {
        if (block[j] !== 0) {
          // exponent = (i+1)*(len-1-j)  (mod 255)
          const exp = ((i + 1) * (block.length - 1 - j)) % 255;
          sum ^= gfMul(block[j], EXP_TABLE[exp]);
        }
      }
      synd[i] = sum;
    }
    return synd;
  }

  /**
   * Locate error positions using Chien search.
   *
   * Returns an array of indices (0‑based, from the start of the block)
   * where errors occurred.
   */
  private findErrorLocations(errorLocator: Uint8Array): number[] {
    const positions: number[] = [];

    // errorLocator is big‑endian: σ(x) = σ₀·x^d + … + σ_d
    const degree = errorLocator.length - 1;

    for (let i = 0; i < this.n; i++) {
      // Evaluate σ(α^{-i}) – we use the fact that α^{255-i} = α^{-i}
      let sum = 0;
      for (let j = 0; j <= degree; j++) {
        const coeff = errorLocator[j];
        if (coeff === 0) continue;
        const power = ((255 - i) * (degree - j)) % 255;
        sum ^= gfMul(coeff, EXP_TABLE[power]);
      }
      if (sum === 0) {
        // Position i is an error (note: i counts from the leftmost symbol)
        positions.push(i);
      }
    }

    return positions;
  }
}