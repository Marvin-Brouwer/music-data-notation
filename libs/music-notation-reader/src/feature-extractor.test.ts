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
 *   export async function extractFeatures(
 *     bin: cv.Mat,
 *     box: cv.Rect,
 *   ): Promise<SymbolFeatures>;
 *
 * The test creates a tiny mock of the global `cv` namespace so the
 * function can be exercised without pulling in the heavy OpenCV‑JS
 * binary.
 */

import { describe, test, expect } from 'vitest';
import { extractFeatures } from './feature-extractor.mts';
import cv from './open-cv-bootstrap.mts';
import type { InputArray, Rect, Mat, MatVector, OutputArray, OutputArrayOfArrays, Point, int } from '@techstark/opencv-js';


function createEmptyMat(rows: number, cols: number) {

  let zeroScalar = new cv.Scalar(0); // RGBA – all zeros
  const mat = new cv.Mat(rows, cols, cv.CV_8UC1, zeroScalar); // start with all zeros (background)

  return mat;
}
function setPixel(mat: Mat, x: number, y: number, color: number) {
  // For a 3‑channel BGR Mat
  const roi = mat.roi(new cv.Rect(x, y, 1, 1));   // Returns a Uint8Array of length 3

  // Fill the ROI with the desired color/value.
  roi.setTo(new cv.Scalar(color)); // Red pixel

  // Clean up the temporary ROI object
  roi.delete();
}
/* ------------------------------------------------------------------
 *  Test suite
 * ------------------------------------------------------------------ */
describe('feature‑extractor.mts – geometric feature extraction', () => {
  // ---------------------------------------------------------------
  // 1️⃣  Fully filled square (no holes)
  // ---------------------------------------------------------------
  test('computes correct aspectRatio, filledRatio, and zero holes for a solid block', () => {
    // ---------- Arrange ----------
    // Create a 10 × 20 binary image (rows = 10, cols = 20)
    const rows = 10;
    const cols = 20;

    const mat = createEmptyMat(rows, cols); // start with all zeros (background)


    // Fill the entire matrix with white (255) → solid block
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        setPixel(mat, x, y, 255);
      }
    }

    // Define a bounding box that exactly covers the whole image
    const box = { x: 0, y: 0, width: cols, height: rows };

    // Prepare an empty contour container – we push **no** contours because
    // there are no inner holes.
    // const contours = new MockMatVector();
    // The real `extractFeatures` creates its own `cv.MatVector`,
    // but we need to make sure the mock `findContours` sees an empty list.
    // Since our mock `findContours` does nothing, we simply rely on the
    // fact that `contours.size()` will be 0.

    // ---------- Act ----------
    const features = extractFeatures(mat as unknown as Mat, box);

    // ---------- Assert ----------
    // Aspect ratio = width / height = 20 / 10 = 2.0
    expect(features.aspectRatio).toBeCloseTo(2.0, 5);

    // Filled ratio = (#white pixels) / (area) = (200) / (200) = 1.0
    expect(features.filledRatio).toBeCloseTo(1.0, 5);

    // No inner contours → holes = 0
    expect(features.holes).toBe(0);
  });

  // ---------------------------------------------------------------
  // 2️⃣  Hollow rectangle (border only) → one hole
  // ---------------------------------------------------------------
  test('detects a single hole inside a hollow rectangle', () => {
    // ---------- Arrange ----------
    const rows = 12;
    const cols = 12;
    const mat = createEmptyMat(rows, cols)

    // Draw a hollow square: set the outer border to 255,
    // leave the interior at 0 (black). This creates exactly ONE hole.
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const isBorder = y === 0 || y === rows - 1 || x === 0 || x === cols - 1;
        if (isBorder) setPixel(mat, x, y, 255);
      }
    }

    // Bounding box covering the whole image
    const box = { x: 0, y: 0, width: cols, height: rows };

    // To make the mock `findContours` report ONE inner contour,
    // we monkey‑patch `cv.findContours` for this test only.
    const originalFindContours = cv.findContours;

    // Monkey-patch for this test
    cv.findContours = (
      _image: InputArray,
      contours: OutputArrayOfArrays,
      ..._args: any[]
    ): void => {
      // Remove any existing Mats in the MatVector
        while (contours.size() > 0) {
          const mat = contours.get(contours.size() - 1);
          mat.delete(); // free memory
          contours.resize(0);
        }

        // Push dummy outer contour (index 0)
        contours.push_back(new cv.Mat());

        // Push dummy inner contour (index 1)
        contours.push_back(new cv.Mat());
    };

    // ---------- Act ----------
    const features = extractFeatures(mat as unknown as Mat, box);

    // Restore the original implementation so other tests aren't affected
    cv.findContours = originalFindContours;

    // ---------- Assert ----------
    // Aspect ratio = 12 / 12 = 1.0
    expect(features.aspectRatio).toBeCloseTo(1.0, 5);

    // Filled ratio = (border pixels) / (area)
    // Border pixels = 4 * (size - 1) = 4 * 11 = 44
    // Area = 12 * 12 = 144
    const expectedFilled = 44 / 144;
    expect(features.filledRatio).toBeCloseTo(expectedFilled, 5);

    // One inner contour → holes = 1
    expect(features.holes).toBe(1);
  });

  // ---------------------------------------------------------------
  // 3️⃣  Non‑square ROI inside a larger image
  // ---------------------------------------------------------------
  test('calculates correct metrics when the ROI is a sub‑region of a larger binary image', () => {
    // ---------- Arrange ----------
    const bigRows = 30;
    const bigCols = 30;
    const big = createEmptyMat(bigRows, bigCols)

    // Fill a 10 × 8 rectangle located at (5, 5) with white.
    const rectX = 5;
    const rectY = 5;
    const rectW = 8;
    const rectH = 10;
    for (let y = rectY; y < rectY + rectH; y++) {
      for (let x = rectX; x < rectX + rectW; x++) {
        setPixel(big, x, y, 255);
      }
    }

    // Define the ROI that exactly matches the filled rectangle.
    const box = { x: rectX, y: rectY, width: rectW, height: rectH };

    // No holes inside this solid block → we keep the default findContours
    // (which does nothing and thus reports 0 contours).

    // ---------- Act ----------
    const features = extractFeatures(big as unknown as Mat, box);

    // ---------- Assert ----------
    // Aspect ratio = width / height = 8 / 10 = 0.8
    expect(features.aspectRatio).toBeCloseTo(0.8, 5);

    // Filled ratio = all pixels are white → 1.0
    expect(features.filledRatio).toBeCloseTo(1.0, 5);

    // No inner contours → holes = 0
    expect(features.holes).toBe(0);
  });
});