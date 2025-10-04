/**
 * tests/preprocess.test.ts
 *
 * Run with: npx vitest run
 *
 * The production module is `src/preprocess.mts`.  It exports:
 *
 *   export function preprocess(img: ImageData): cv.Mat;
 *
 * The function converts the supplied ImageData (RGBA) into a
 * single‑channel binary mask (CV_8UC1) using OpenCV‑JS.
 *
 * This suite follows the same conventions you already have in
 * `feature-extractor.test.ts` (AAA, explicit helpers, no `it`).
 */

import { describe, test, expect } from 'vitest';
import { preprocess } from './preprocess.mts';
import cv from './open-cv-bootstrap.mts';
import type { Mat } from '@techstark/opencv-js';
import { writeImageToConsole } from './debug-tools/mat-debug.mts';

/* ------------------------------------------------------------------
 *  Helper – creates an ImageData‑like plain object (no constructor)
 * ------------------------------------------------------------------ */
function createImageData(
    rows: number,
    cols: number,
    bgGray: number,
    squareGray: number,
    squareSize: number,
): ImageData {
    // Flat RGBA buffer: [R,G,B,A,R,G,B,A,…]
    const data = new Uint8ClampedArray(rows * cols * 4);
    const bg = bgGray;
    const fg = squareGray;
    const alpha = 255; // opaque

    // Fill background
    for (let i = 0; i < data.length; i += 4) {
        data[i] = bg;     // R
        data[i + 1] = bg; // G
        data[i + 2] = bg; // B
        data[i + 3] = alpha;
    }

    // Centre‑aligned square
    const half = Math.floor(squareSize / 2);
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    const x0 = cx - half;
    const y0 = cy - half;

    for (let y = y0; y < y0 + squareSize; y++) {
        for (let x = x0; x < x0 + squareSize; x++) {
            const idx = (y * cols + x) * 4;
            data[idx] = fg;     // R
            data[idx + 1] = fg; // G
            data[idx + 2] = fg; // B
            data[idx + 3] = alpha;
        }
    }

    // Return a plain object that satisfies the ImageData interface.
    return {
        data,
        width: cols,
        height: rows,
    } as ImageData;
}

/* ------------------------------------------------------------------
 *  Test suite – AAA style (no beforeAll)
 * ------------------------------------------------------------------ */
describe('preprocess.mts – ImageData → binary mask (inverse threshold)',  () => {
    // ---------------------------------------------------------------
    // 1️⃣  High‑contrast image: dark background, bright square
    // ---------------------------------------------------------------
    test('produces an inverse binary mask where the bright square becomes non‑white', () => {
        // ---------- Arrange ----------
        const rows = 40;
        const cols = 40;
        const bgGray = 30;      // dark background (will become white after inversion)
        const sqGray = 220;     // bright square (will become black after inversion)
        const squareSize = 12;  // 12 × 12 square

        const img = createImageData(rows, cols, bgGray, sqGray, squareSize);

        // ---------- Act ----------
        const binary: Mat = preprocess(img);

        // ---------- Assert ----------
        // 1️⃣  Result must be a single‑channel 8‑bit matrix.
        expect(binary.type()).toBe(cv.CV_8UC1);

        // 2️⃣  Background corners should be white (255) because of the
        //     inverse threshold.
        expect(binary.ucharPtr(0, 0)[0]).toBe(255);
        expect(binary.ucharPtr(rows - 1, cols - 1)[0]).toBe(255);

        // 3️⃣  The centre of the square must **not** be white.
        //     (It will be 0 after inversion, but we only care that it isn’t 255.)
        const centreX = Math.floor(cols / 2);
        const centreY = Math.floor(rows / 2);
        expect(binary.ucharPtr(centreY, centreX)[0]).not.toBe(255);

        // 4️⃣  Non‑zero pixel count should be roughly the background area
        //     (total pixels minus the square area).  Allow ±20 % tolerance
        //     because the Gaussian blur spreads the edge a few pixels.
        const totalPixels = rows * cols;
        const squareArea = squareSize * squareSize;
        const expectedBackground = totalPixels - squareArea;
        const nonZero = cv.countNonZero(binary);
        const tolerance = Math.floor(expectedBackground * 0.2);
        expect(Math.abs(nonZero - expectedBackground)).toBeLessThanOrEqual(tolerance);

        // ---------- Clean up ----------
        binary.delete();
    });

    // ---------------------------------------------------------------
    // 2️⃣  Low‑contrast image – foreground only slightly brighter
    // ---------------------------------------------------------------
    test('still returns a binary mask for low‑contrast input (foreground may be lost)', () => {
        // ---------- Arrange ----------
        const rows = 30;
        const cols = 30;
        const bgGray = 100;   // medium grey background
        const sqGray = 130;   // only a little brighter
        const squareSize = 10;

        const img = createImageData(rows, cols, bgGray, sqGray, squareSize);
        writeImageToConsole('img', img)

        // ---------- Act ----------
        const binary: Mat = preprocess(img);
        writeImageToConsole('binary', binary)

        // ---------- Assert ----------
        // Result must still be a single‑channel 8‑bit matrix.
        expect(binary.type()).toBe(cv.CV_8UC1);

        // Background corners should be white (255) after inversion.
        expect(binary.ucharPtr(0, 0)[0]).toBe(255);
        expect(binary.ucharPtr(rows - 1, cols - 1)[0]).toBe(255);

        // The centre can be either black (0) if the square survived,
        // or white (255) if the low contrast caused it to be merged
        // into the background.  Both are acceptable.
        const centreX = Math.floor(cols / 2);
        const centreY = Math.floor(rows / 2);
        const centreVal = binary.ucharPtr(centreY, centreX)[0];
        expect([0, 255]).toContain(centreVal);

        // There must be **some** white pixels (the background) and the
        // image must not be completely black.
        const nonZero = cv.countNonZero(binary);
        const totalPixels = rows * cols;
        expect(nonZero).toBeGreaterThan(0);          // at least some white
        expect(nonZero).toBeLessThan(totalPixels);  // not all white (because of inversion)

        // ---------- Clean up ----------
        binary.delete();
    });

    // ---------------------------------------------------------------
    // 3️⃣  Verify that the original ImageData is **not** mutated
    // ---------------------------------------------------------------
    test('does not alter the source ImageData', () => {
        // ---------- Arrange ----------
        const rows = 20;
        const cols = 20;
        const bgGray = 50;
        const sqGray = 200;
        const squareSize = 8;

        const img = createImageData(rows, cols, bgGray, sqGray, squareSize);

        // Clone the raw pixel buffer for later comparison.
        const originalBuffer = new Uint8ClampedArray(img.data);

        // ---------- Act ----------
        const binary: Mat = preprocess(img);
        binary.delete();

        // ---------- Assert ----------
        // Every byte in the original ImageData must be unchanged.
        for (let i = 0; i < img.data.length; i++) {
            expect(img.data[i]).toBe(originalBuffer[i]);
        }
    });
});