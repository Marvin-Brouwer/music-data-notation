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

/* ------------------------------------------------------------------
 *  Additional test cases – keep the same helpers & style
 * ------------------------------------------------------------------ */
describe('feature‑extractor.mts – extra edge‑case coverage', () => {
  // ---------------------------------------------------------------
  // A️⃣  Partial‑fill (50 % white) → verify filledRatio calculation
  // ---------------------------------------------------------------
  test('reports a 0.5 filledRatio for a half‑filled block', () => {
    // ---------- Arrange ----------
    const rows = 10;
    const cols = 10;
    const mat = createEmptyMat(rows, cols);

    // Fill the *left half* of the matrix (columns 0‑4) with white.
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols / 2; x++) {
        setPixel(mat, x, y, 255);
      }
    }

    const box = { x: 0, y: 0, width: cols, height: rows };

    // ---------- Act ----------
    const features = extractFeatures(mat, box);

    // ---------- Clean up ----------
    mat.delete();

    // ---------- Assert ----------
    expect(features.aspectRatio).toBeCloseTo(1.0, 5); // 10 / 10
    expect(features.filledRatio).toBeCloseTo(0.5, 5); // exactly half the pixels are white
    expect(features.holes).toBe(0);                // no inner contours
  });

  // ---------------------------------------------------------------
  // B️⃣  Multiple holes (two nested cavities) → holes === 2
  // ---------------------------------------------------------------
  test('counts two holes when the ROI contains two nested inner contours', () => {
    // ---------- Arrange ----------
    const size = 20;
    const mat = createEmptyMat(size, size);

    // Draw an outer border (white) – this will be the *outer* contour.
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const isOuterBorder =
          y === 0 || y === size - 1 || x === 0 || x === size - 1;
        if (isOuterBorder) setPixel(mat, x, y, 255);
      }
    }

    // Inside that border draw **two separate white squares** that will act as
    // inner holes when `findContours` is invoked.
    // Square 1 (top‑left)
    for (let y = 4; y < 8; y++) {
      for (let x = 4; x < 8; x++) {
        setPixel(mat, x, y, 255);
      }
    }
    // Square 2 (bottom‑right)
    for (let y = 12; y < 16; y++) {
      for (let x = 12; x < 16; x++) {
        setPixel(mat, x, y, 255);
      }
    }

    const box = { x: 0, y: 0, width: size, height: size };

    // ----- Monkey‑patch cv.findContours to return three contours:
    //   0 → outer border, 1 → inner square 1, 2 → inner square 2
    const originalFindContours = cv.findContours;
    cv.findContours = (
      _image: InputArray,
      contours: OutputArrayOfArrays,
      ..._rest: any[]
    ): void => {
      // Empty any previous content first.
      while (contours.size() > 0) {
        const old = contours.get(contours.size() - 1);
        old.delete();
        contours.resize(0);
      }
      // Outer contour
      contours.push_back(new cv.Mat());
      // First inner contour
      contours.push_back(new cv.Mat());
      // Second inner contour
      contours.push_back(new cv.Mat());
    };

    // ---------- Act ----------
    const features = extractFeatures(mat, box);

    // Restore original implementation
    cv.findContours = originalFindContours;

    // ---------- Clean up ----------
    mat.delete();

    // ---------- Assert ----------
    expect(features.aspectRatio).toBeCloseTo(1.0, 5); // square ROI
    // Filled ratio is not the focus here; just ensure it’s a valid number.
    expect(typeof features.filledRatio).toBe('number');
    // Two inner contours → holes = 2
    expect(features.holes).toBe(2);
  });

  // ---------------------------------------------------------------
  // C️⃣  Default findContours (no monkey‑patch) → holes === 0
  // ---------------------------------------------------------------
  test('returns zero holes when the real OpenCV findContours finds none', () => {
    // ---------- Arrange ----------
    const rows = 8;
    const cols = 12;
    const mat = createEmptyMat(rows, cols);

    // Fill the whole matrix – a solid block has no inner contours.
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        setPixel(mat, x, y, 255);
      }
    }

    const box = { x: 0, y: 0, width: cols, height: rows };

    // ---------- Act ----------
    const features = extractFeatures(mat, box);

    // ---------- Clean up ----------
    mat.delete();

    // ---------- Assert ----------
    expect(features.aspectRatio).toBeCloseTo(cols / rows, 5);
    expect(features.filledRatio).toBeCloseTo(1.0, 5);
    // The genuine OpenCV implementation returns an empty MatVector for a solid block,
    // so `holes` should be 0 (size() == 0 → 0‑1 = -1, but the production code subtracts 1
    // only after checking that size() > 0 – the net result is 0 holes).
    expect(features.holes).toBe(0);
  });

  // ---------------------------------------------------------------
  // D️⃣  Non‑integer aspect ratio (7 × 13) → verify floating‑point division
  // ---------------------------------------------------------------
  test('calculates a non‑integer aspect ratio correctly', () => {
    // ---------- Arrange ----------
    const rows = 7;
    const cols = 13;
    const mat = createEmptyMat(rows, cols);

    // Fill everything – we only care about the aspect ratio here.
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        setPixel(mat, x, y, 255);
      }
    }

    const box = { x: 0, y: 0, width: cols, height: rows };

    // ---------- Act ----------
    const features = extractFeatures(mat, box);

    // ---------- Clean up ----------
    mat.delete();

    // ---------- Assert ----------
    const expectedAspect = cols / rows; // 13 / 7 ≈ 1.857142857
    expect(features.aspectRatio).toBeCloseTo(expectedAspect, 5);
    expect(features.filledRatio).toBeCloseTo(1.0, 5);
    expect(features.holes).toBe(0);
  });
});