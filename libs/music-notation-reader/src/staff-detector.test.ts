/**
 * tests/staff-detector.test.ts
 *
 * Run with: npx vitest run
 *
 * The production module is `src/staff-detector.mts`.  It exports:
 *
 *   export function detectStaffLines(bin: cv.Mat): number[];
 *
 * The test suite follows the same conventions you already have in
 * `feature-extractor.test.ts` (AAA, explicit helpers, no `it`).
 */

import { describe, test, expect } from 'vitest';
import { detectStaffLines } from './staff-detector.mts';
import cv from './open-cv-bootstrap.mts';
import type { Mat } from '@techstark/opencv-js';
import { writeImageToConsole } from './debug-tools/mat-debug.mts';

/* ------------------------------------------------------------------
 *  Helper – creates a binary (CV_8UC1) Mat that contains horizontal
 *           staff lines.  The background is black (0), the lines are
 *           white (255).  All lines are 1‑pixel thick.
 *
 *  Parameters:
 *    rows, cols   – dimensions of the image
 *    lineYs      – array of Y‑coordinates (top‑to‑bottom) where a
 *                  white line should be drawn.
 *
 *  Returns a cv.Mat ready to be fed into `detectStaffLines`.
 * ------------------------------------------------------------------ */
function createStaffBinaryMat(
  rows: number,
  cols: number,
  lineYs: number[],
): Mat {
  // Allocate a black single‑channel matrix.
  const mat = new cv.Mat(rows, cols, cv.CV_8UC1, new cv.Scalar(0));

  // Draw each staff line (white = 255).
  lineYs.forEach((y) => {
    // Guard against out‑of‑bounds indices.
    if (y < 0 || y >= rows) return;
    const rowPtr = mat.row(y);
    rowPtr.setTo(new cv.Scalar(255));
    rowPtr.delete(); // free the temporary row header
  });

  return mat;
}

/* ------------------------------------------------------------------
 *  Test suite – AAA style
 * ------------------------------------------------------------------ */
describe('staff-detector.mts – staff‑line detection', () => {
  // ---------------------------------------------------------------
  // 1️⃣  Perfect five‑line staff (regular spacing)
  // ---------------------------------------------------------------
  test('detects five evenly spaced staff lines in a clean binary image', () => {
    // ---------- Arrange ----------
    const rows = 60;
    const cols = 80;
    const lineSpacing = 10;               // distance between consecutive lines
    const staffLines = [10, 20, 30, 40, 50]; // top → bottom (all in bounds)

    const binary = createStaffBinaryMat(rows, cols, staffLines);
    writeImageToConsole('clean binary (staff)', binary); // optional visual debug

    // ---------- Act ----------
    const detected = detectStaffLines(binary);

    // ---------- Assert ----------
    // The detector should return exactly the five Y‑positions we drew.
    expect(detected).toHaveLength(5);
    expect(detected).toEqual(staffLines);

    // Clean up
    binary.delete();
  });

  // ---------------------------------------------------------------
  // 2️⃣  Staff lines with a little noise (random speckles)
  // ---------------------------------------------------------------
  test('still finds the correct lines when the binary image contains isolated noise pixels', () => {
    // ---------- Arrange ----------
    const rows = 60;
    const cols = 80;
    // Use in‑bounds, slightly irregular spacing.
    const staffLines = [12, 24, 36, 48, 56];
    const binary = createStaffBinaryMat(rows, cols, staffLines);

    // Add a few random white speckles (noise) that are not part of a line.
    const rng = (max: number) => Math.floor(Math.random() * max);
    for (let i = 0; i < 15; i++) {
      const nx = rng(cols);
      const ny = rng(rows);
      binary.ucharPtr(ny, nx)[0] = 255; // single white pixel
    }

    writeImageToConsole('binary with noise', binary);

    // ---------- Act ----------
    const detected = detectStaffLines(binary);

    // ---------- Assert ----------
    // The algorithm should still locate *most* of the lines.
    // We allow it to miss at most one line in the presence of noise.
    expect(detected.length).toBeGreaterThanOrEqual(4);
    expect(detected.length).toBeLessThanOrEqual(5);

    // For each expected line, make sure there is a detected line
    // within ±1 pixel (the projection‑profile can shift by one).
    staffLines.forEach((expectedY) => {
      const match = detected.some(
        (detY) => Math.abs(detY - expectedY) <= 1,
      );
      expect(match).toBe(true);
    });

    // Clean up
    binary.delete();
  });

  // ---------------------------------------------------------------
  // 3️⃣  Image with **no** staff lines – detector should return [].
  // ---------------------------------------------------------------
  test('returns an empty array when the binary image contains no horizontal lines', () => {
    // ---------- Arrange ----------
    const rows = 40;
    const cols = 60;
    // Completely black image (no white pixels at all)
    const binary = new cv.Mat(rows, cols, cv.CV_8UC1, new cv.Scalar(0));

    writeImageToConsole('empty binary (no lines)', binary);

    // ---------- Act ----------
    const detected = detectStaffLines(binary);

    // ---------- Assert ----------
    expect(detected).toEqual([]); // empty array

    // Clean up
    binary.delete();
  });
});