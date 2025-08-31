/**
 * @module poly
 * Polynomial operations over GF(256), with **MSB-first** representation.
 *
 * Example: [3, 5, 1] means 3x² + 5x + 1
 */

import gf from "./gf256.mts";

/**
 * Scale a polynomial by a scalar `k`, optionally shift by `x^shift`.
 * Returns a **new Uint8Array** of length `poly.length + shift`.
 *
 * @param poly   Polynomial coefficients, MSB-first (highest-degree term first)
 * @param k      Scalar to multiply with
 * @param shift  Power of x to multiply (default 0)
 */
function scale(poly: Uint8Array, k: number, shift = 0): Uint8Array {
    const out = new Uint8Array(poly.length + shift);
    for (let i = 0; i < poly.length; i++) {
        out[i] = gf.mul(poly[i], k);
    }
    return out;
}

/**
 * Add (XOR) two polynomials, returns a new polynomial.
 * Both inputs are assumed to be MSB-first.
 */
function add(a: Uint8Array, b: Uint8Array): Uint8Array {
    const maxLen = Math.max(a.length, b.length);
    const out = new Uint8Array(maxLen);

    // Right-align both inputs for XOR
    const offsetA = maxLen - a.length;
    const offsetB = maxLen - b.length;

    for (let i = 0; i < a.length; i++) {
        out[i + offsetA] ^= a[i];
    }
    for (let i = 0; i < b.length; i++) {
        out[i + offsetB] ^= b[i];
    }

    return out;
}

/**
 * Multiply two polynomials (convolution) in GF(256), returns a new polynomial.
 * Both inputs must be MSB-first.
 */
function mul(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length + b.length - 1);

    for (let i = 0; i < a.length; i++) {
        for (let j = 0; j < b.length; j++) {
            result[i + j] ^= gf.mul(a[i], b[j]);
        }
    }

    return result;
}

/**
 * Evaluate a polynomial at point x using Horner’s rule.
 * Polynomial must be MSB-first.
 */
function evalAt(poly: Uint8Array, x: number): number {
    let result = 0;
    for (let i = 0; i < poly.length; i++) {
        result = gf.mul(result, x) ^ poly[i];
    }
    return result;
}

/**
 * Multiply a polynomial by x^k (i.e. shift all terms to higher degree).
 * This appends `k` zero coefficients to the end (right).
 *
 * @param poly  Polynomial in MSB-first order
 * @param k     Number of x-multiplies (defaults to 1)
 */
function shiftLeft(poly: Uint8Array, k = 1): Uint8Array {
    if (k <= 0) return poly.slice(); // no-op
    const out = new Uint8Array(poly.length + k);
    out.set(poly, 0);  // same MSB-first order, just add trailing 0s
    return out;
}

/**
 * Strip leading zero coefficients.
 */
function trim(poly: Uint8Array): Uint8Array {
    let firstNonZero = 0;
    while (firstNonZero < poly.length && poly[firstNonZero] === 0) {
        firstNonZero++;
    }
    return poly.slice(firstNonZero);
}

function sliceStep(poly: Uint8Array, start: number, end: number, step: number): Uint8Array {
    const result: number[] = [];
    for (let i = start; i < end; i += step) {
        result.push(poly[i]);
    }
    return new Uint8Array(result);
}

/**
 * Pretty print for debugging
 */
function toString(poly: Uint8Array): string {
    const terms = [];
    const deg = poly.length - 1;
    for (let i = 0; i < poly.length; i++) {
        const coeff = poly[i];
        if (coeff === 0) continue;
        const power = deg - i;
        if (power === 0) terms.push(`${coeff}`);
        else if (power === 1) terms.push(`${coeff}x`);
        else terms.push(`${coeff}x^${power}`);
    }
    return terms.length ? terms.join(" + ") : "0";
}

export default {
    scale,
    add,
    mul,
    eval: evalAt,
    shiftLeft,
    trim,
    sliceStep,
    toString,
};
