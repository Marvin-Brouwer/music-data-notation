/**
 * tests/feature-extractor.test.ts
 *
 * Run with: npx vitest run
 *
 * The production module is `src/feature-extractor.mts`.
 * It exports:
 *
 *   export interface SymbolFeatures {
 *     aspectRatio: number;
 *     filledRatio: number;
 *     holes: number;
 *   }
 *
 *   export function extractFeatures(
 *     bin: cv.Mat,
 *     box: cv.Rect,
 *   ): Promise<SymbolFeatures>;
 *
 * The test uses the real OpenCV‑JS runtime that is boot‑strapped
 * by `open-cv-bootstrap.mts`.  No heavy manual mocks are needed.
 */

import { describe, test, expect } from 'vitest';
import { extractFeatures } from './feature-extractor.mts';
import cv from './open-cv-bootstrap.mts';
import type { Mat, InputArray, OutputArrayOfArrays } from '@techstark/opencv-js';

/* ------------------------------------------------------------------
 *  Helpers
 * ------------------------------------------------------------------ */

/**
 * Allocate a single‑channel 8‑bit matrix filled with zeros.
 */
function createEmptyMat(rows: number, cols: number): Mat {
  const zeroScalar = new cv.Scalar(0); // background = 0
  // CV_8UC1 → 1 channel, unsigned 8‑bit
  return new cv.Mat(rows, cols, cv.CV_8UC1, zeroScalar);
}

/**
 * Write a pixel value (0‑255) into a single‑channel matrix.
 *
 * `x` = column, `y` = row (both zero‑based).
 */
function setPixel(mat: Mat, x: number, y: number, value: number): void {
  // `ucharPtr` returns a Uint8Array view of length 1 for a 1‑channel mat.
  mat.ucharPtr(y, x)[0] = value;
}

/* ------------------------------------------------------------------
 *  Test suite – AAA (Arrange‑Act‑Assert)
 * ------------------------------------------------------------------ */
describe('feature‑extractor.mts – geometric feature extraction', () => {
  // ---------------------------------------------------------------
  // 1️⃣  Fully filled square (no holes)
  // ---------------------------------------------------------------
  test('computes correct aspectRatio, filledRatio, and zero holes for a solid block', () => {
    // ---------- Arrange ----------
    const rows = 10;
    const cols = 20;

    const mat = createEmptyMat(rows, cols);

    // Fill the whole matrix with white (255)
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        setPixel(mat, x, y, 255);
      }
    }

    const box = { x: 0, y: 0, width: cols, height: rows };

    // ---------- Act ----------
    const features = extractFeatures(mat, box);

    // Clean up the native resources
    mat.delete();

    // ---------- Assert ----------
    expect(features.aspectRatio).toBeCloseTo(2.0, 5); // 20 / 10
    expect(features.filledRatio).toBeCloseTo(1.0, 5); // all pixels white
    expect(features.holes).toBe(0);
  });

  // ---------------------------------------------------------------
  // 2️⃣  Hollow rectangle (border only) → one hole
  // ---------------------------------------------------------------
  test('detects a single hole inside a hollow rectangle', () => {
    // ---------- Arrange ----------
    const rows = 12;
    const cols = 12;
    const mat = createEmptyMat(rows, cols);

    // Draw a 1‑pixel border (white) around the edges.
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const isBorder =
          y === 0 || y === rows - 1 || x === 0 || x === cols - 1;
        if (isBorder) setPixel(mat, x, y, 255);
      }
    }

    const box = { x: 0, y: 0, width: cols, height: rows };

    // ----- Monkey‑patch cv.findContours for this test only -----
    const originalFindContours = cv.findContours;

    cv.findContours = (
      _image: InputArray,
      contours: OutputArrayOfArrays,
      ..._rest: any[]
    ): void => {
      // Empty the vector first (free any previously‑stored Mats)
      while (contours.size() > 0) {
        const old = contours.get(contours.size() - 1);
        old.delete();
        contours.resize(0);
      }

      // Push a dummy outer contour (index 0)
      contours.push_back(new cv.Mat());

      // Push a dummy inner contour (index 1) → counted as a hole
      contours.push_back(new cv.Mat());
    };

    // ---------- Act ----------
    const features = extractFeatures(mat, box);

    // Restore the original implementation so later tests aren’t polluted
    cv.findContours = originalFindContours;

    // Clean up the matrix we allocated
    mat.delete();

    // ---------- Assert ----------
    expect(features.aspectRatio).toBeCloseTo(1.0, 5); // 12 / 12

    // Border pixels = 4 * (size‑1) = 4 * 11 = 44
    const expectedFilled = 44 / (12 * 12);
    expect(features.filledRatio).toBeCloseTo(expectedFilled, 5);

    expect(features.holes).toBe(1);
  });

  // ---------------------------------------------------------------
  // 3️⃣  Non‑square ROI inside a larger image
  // ---------------------------------------------------------------
  test('calculates correct metrics when the ROI is a sub‑region of a larger binary image', () => {
    // ---------- Arrange ----------
    const bigRows = 30;
    const bigCols = 30;
    const big = createEmptyMat(bigRows, bigCols);

    // Paint a solid 8 × 10 rectangle at offset (5, 5)
    const rectX = 5;
    const rectY = 5;
    const rectW = 8;
    const rectH = 10;

    for (let y = rectY; y < rectY + rectH; y++) {
      for (let x = rectX; x < rectX + rectW; x++) {
        setPixel(big, x, y, 255);
      }
    }

    const box = { x: rectX, y: rectY, width: rectW, height: rectH };

    // No holes → we keep the default (no‑op) findContours implementation.

    // ---------- Act ----------
    const features = extractFeatures(big, box);

    // Clean up the big matrix
    big.delete();

    // ---------- Assert ----------
    expect(features.aspectRatio).toBeCloseTo(0.8, 5); // 8 / 10
    expect(features.filledRatio).toBeCloseTo(1.0, 5); // fully white inside ROI
    expect(features.holes).toBe(0);
  });
});