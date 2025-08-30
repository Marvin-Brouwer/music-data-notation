// src/reed-solomon-encoding/erc/gf256.mts
/**
 * GF(256) – Galois Field arithmetic for Reed‑Solomon codes.
 *
 * The field is constructed with the irreducible polynomial
 *   x⁸ + x⁴ + x³ + x² + 1   (0x11d)
 * which is the same primitive polynomial used by most QR‑code / RS implementations.
 *
 * This module supplies the basic operations that the higher‑level algorithms
 * (Berlekamp‑Massey, Forney, etc.) need:
 *   - add / sub  (identical in characteristic‑2 fields ⇒ XOR)
 *   - mul        (log/antilog tables)
 *   - div        (mul with inverse)
 *   - pow        (repeated multiplication)
 *   - exp        (antilog lookup)
 *   - inverse    (log/antilog based)
 *   - log / antilog tables (private)
 *
 * The original `music-data-notation` version omitted a handful of helpers
 * (`div`, `pow`, `inverse`, `log`, `exp`).  They are added below.
 *
 * All functions operate on **byte values** (0‑255) and return a byte value.
 * The implementation is deliberately straightforward for readability and
 * correctness – performance is still excellent because every operation is a
 * simple table lookup or a single XOR.
 */

export class GF256 {
  private static readonly PRIMITIVE = 0x11d;
  public readonly logTable = new Uint8Array(256);
  public readonly expTable = new Uint8Array(512); // duplicate for easy modulo

  constructor() {
    this.buildTables();
  }

  /** Build log/exp tables (once per instance). */
  private buildTables(): void {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      this.expTable[i] = x;
      this.logTable[x] = i;

      x <<= 1;                     // multiply by α (0x02)
      if (x & 0x100) x ^= GF256.PRIMITIVE;
    }
    // duplicate for fast modulo 255 indexing
    for (let i = 255; i < 512; i++) this.expTable[i] = this.expTable[i - 255];
    this.logTable[0] = 0; // unused, but keep defined
  }

  /** Addition / subtraction = XOR in characteristic‑2 fields. */
  add(a: number, b: number): number { return a ^ b; }
  sub(a: number, b: number): number { return a ^ b; }

  /** Multiplication via log/exp tables. */
  mul(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    const la = this.logTable[a];
    const lb = this.logTable[b];
    return this.expTable[la + lb];
  }

  /** Division a / b (b ≠ 0). */
  div(a: number, b: number): number {
    if (b === 0) throw new Error('Division by zero in GF(256)');
    if (a === 0) return 0;
    const la = this.logTable[a];
    const lb = this.logTable[b];
    const diff = (la - lb + 255) % 255;
    return this.expTable[diff];
  }

  /** Exponential of the generator: α^e (e may be negative). */
  exp(e: number): number {
    const norm = ((e % 255) + 255) % 255;
    return this.expTable[norm];
  }

  /** Power a^e (e ≥ 0). */
  pow(a: number, e: number): number {
    if (e === 0) return 1;
    if (a === 0) return 0;
    const la = this.logTable[a];
    const resLog = (la * e) % 255;
    const norm = (resLog + 255) % 255;
    return this.expTable[norm];
  }

  /** Multiplicative inverse a⁻¹ (a ≠ 0). */
  inv(a: number): number {
    if (a === 0) throw new Error('Cannot invert zero in GF(256)');
    const la = this.logTable[a];
    const invLog = (255 - la) % 255;
    return this.expTable[invLog];
  }

  /** Log base α (undefined for 0). */
  log(a: number): number {
    if (a === 0) throw new Error('log(0) is undefined in GF(256)');
    return this.logTable[a];
  }

  /** Alias for exp – kept for API symmetry. */
  antilog(e: number): number { return this.exp(e); }
}

/* ------------------------------------------------------------------
 *  Export a singleton instance for convenience (optional)
 * ---------------------------------------------------------------- */
// Many callers prefer `import GF256 from './gf256.mts'` and then reuse the same
// tables.  Exporting a ready‑made instance avoids constructing the tables
// repeatedly if the class is instantiated many times.
export const gf = new GF256();
export const LOG_TABLE = gf.logTable;
export const EXP_TABLE = gf.expTable;

export default gf;