import gf, { EXP_TABLE } from "./gf256.mts";

/**
   * Forney algorithm – compute error magnitudes given syndromes,
   * the error‑locator polynomial, and error positions.
   */
export function forneyAlgorithm(
    syndromes: Uint8Array,
    errorLocator: Uint8Array,
    errorPositions: number[]
): Uint8Array {

    // Compute the formal derivative of the error‑locator polynomial.
    const derivative = new Uint8Array(errorLocator.length - 1);
    for (let i = 0; i < derivative.length; i++) {
        // derivative coefficient = (i+1) * σ_{i+1}
        // In GF(256) multiplication by an integer is just repeated addition,
        // but we can use the exponent table for speed:
        const coeff = errorLocator[i + 1];
        if (coeff === 0) {
            derivative[i] = 0;
        } else {
            // (i+1) is a small integer; we multiply via repeated gfMul.
            let mult = 1;
            for (let k = 0; k < i + 1; k++) {
                mult = gf.mul(mult, 2); // multiply by 2 repeatedly (since 2 is a generator)
            }
            derivative[i] = gf.mul(coeff, mult);
        }
    }

    const magnitudes = new Uint8Array(errorPositions.length);

    for (let idx = 0; idx < errorPositions.length; idx++) {
        const pos = errorPositions[idx];
        // Compute ω(α^{-pos}) where ω(x) = Σ S_i x^{i-1}
        let omega = 0;
        for (let i = 0; i < syndromes.length; i++) {
            const s = syndromes[i];
            if (s === 0) continue;
            const power = ((i + 1) * (255 - pos)) % 255;
            omega ^= gf.mul(s, EXP_TABLE[power]);
        }

        // Compute σ'(α^{-pos})
        let sigmaPrime = 0;
        for (let i = 0; i < derivative.length; i++) {
            const coeff = derivative[i];
            if (coeff === 0) continue;
            const power = ((i + 1) * (255 - pos)) % 255;
            sigmaPrime ^= gf.mul(coeff, EXP_TABLE[power]);
        }

        if (sigmaPrime === 0) {
            throw new Error('Forney algorithm division by zero');
        }

        const invSigmaPrime = gf.inv(sigmaPrime);
        const magnitude = gf.mul(omega, invSigmaPrime);
        magnitudes[idx] = magnitude;
    }

    return magnitudes;
}