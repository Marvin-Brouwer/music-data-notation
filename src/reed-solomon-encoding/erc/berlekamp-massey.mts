import gf from "./gf256.mts";

/**
  * Berlekamp‑Massey algorithm – returns the error‑locator polynomial σ(x)
  * as a big‑endian coefficient array.
  */
export function berlekampMassey(syndromes: Uint8Array): Uint8Array {
    let C = Uint8Array.of(1); // connection polynomial
    let B = Uint8Array.of(1); // previous C
    let L = 0; // current degree of C
    let m = 1;
    let b = 1;

    for (let n = 0; n < syndromes.length; n++) {
        // Compute discrepancy d
        let d = syndromes[n];
        for (let i = 1; i <= L; i++) {
            d ^= gf.mul(C[C.length - 1 - i], syndromes[n - i]);
        }

        if (d === 0) {
            m++;
            continue;
        }

        const coeff = gf.div(d, b);
        // C = C - coeff * x^m * B
        const shiftB = new Uint8Array(B.length + m);
        shiftB.set(B, 0); // B shifted by m positions (prepend zeros)
        for (let i = 0; i < shiftB.length; i++) {
            shiftB[i] = gf.mul(shiftB[i], coeff);
        }

        // Pad C to the same length as shiftB
        if (C.length < shiftB.length) {
            const padded = new Uint8Array(shiftB.length);
            padded.set(C, shiftB.length - C.length);
            C = padded;
        }

        // XOR (addition in GF(256))
        for (let i = 0; i < shiftB.length; i++) {
            C[C.length - shiftB.length + i] ^= shiftB[i];
        }

        if (2 * L <= n) {
            B = Uint8Array.from(C); // copy before we modify it
            L = n + 1 - L;
            b = d;
            m = 1;
        } else {
            m++;
        }
    }

    // Ensure the polynomial is monic (leading coefficient = 1)
    if (C[0] !== 1) {
        const invLead = gf.inv(C[0]);
        for (let i = 0; i < C.length; i++) {
            C[i] = gf.mul(C[i], invLead);
        }
    }
    return C;
}