/**
 * GF(256) arithmetic utilities.
 *
 * The field is built with the primitive polynomial x⁸ + x⁴ + x³ + x² + 1
 * (binary 0b100011101 = 0x11d), which is the same polynomial used by
 * QR‑codes and many other Reed‑Solomon implementations.
 *
 * The tables are generated once at module load time and then reused for
 * fast multiplication/division.
 *
 * @module gf256
 */

// TODO SEAL FREEZE ETC.
/** Exponent table: αⁱ → value (i from 0 to 254, α is the generator). */
export const EXP_TABLE: Readonly<Uint8Array> = (() => {
    const table = new Uint8Array(512);
    let x = 1;
    for (let i = 0; i < 255; i++) {
      table[i] = x;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d; // primitive polynomial 0x11d
    }
    for (let i = 255; i < 512; i++) table[i] = table[i - 255];
    return table;
  })();
/** Logarithm table: value → i such that αⁱ = value (value ≠ 0). */
export const LOG_TABLE: Readonly<Uint8Array> = (() => {
    const table = new Uint8Array(256);
    for (let i = 0; i < 255; i++) {
      table[EXP_TABLE[i]] = i;
    }
    return table;
  })();
  
/**
 * Multiply two field elements.
 *
 * @param a First operand (0‑255).
 * @param b Second operand (0‑255).
 * @returns The product a·b in GF(256).
 */
export function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  const logSum = LOG_TABLE[a] + LOG_TABLE[b]
  return EXP_TABLE[logSum] // logSum is already < 512 because of duplication
}

/**
 * Divide `a` by `b` in GF(256).
 *
 * @throws if `b` is zero.
 */
export function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero in GF(256)')
  if (a === 0) return 0
  const logDiff = LOG_TABLE[a] - LOG_TABLE[b]
  // Adding 255 guarantees a non‑negative index before the lookup.
  return EXP_TABLE[logDiff + 255]
}

/**
 * Compute the multiplicative inverse of a non‑zero field element.
 *
 * @throws if `a` is zero.
 */
export function gfInv(a: number): number {
  if (a === 0) throw new Error('Inverse of zero does not exist in GF(256)')
  return EXP_TABLE[255 - LOG_TABLE[a]]
}