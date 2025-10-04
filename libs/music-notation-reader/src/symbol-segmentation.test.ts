/**
 * tests/symbol-segmentation.test.ts
 *
 * Run with: npx vitest run
 *
 * The production module is `src/symbol-segmentation.mts`.  It exports:
 *
 *   export function segmentSymbols(bin: cv.Mat): cv.Rect[];
 *
 * The test suite mirrors the conventions you already have in
 * `feature-extractor.test.ts` (AAA, explicit helpers, no `it`).
 */

import { describe, test, expect } from 'vitest';
import { segmentSymbols } from './symbol-segmentation.mts';
import cv from './open-cv-bootstrap.mts';
import type { Mat, Rect } from '@techstark/opencv-js';
import { writeImageToConsole } from './debug-tools/mat-debug.mts';

/* ------------------------------------------------------------------
 *  Helper – creates a binary (CV_8UC1) Mat with arbitrary white blobs.
 *
 *  Parameters:
 *    rows, cols   – dimensions of the image
 *    boxes        – an array of cv.Rect describing where to draw white
 *                  rectangles (the “symbols”).  Each rectangle will be
 *                  filled with 255 (white) on a black background.
 *
 *  Returns a cv.Mat ready to be fed into `segmentSymbols`.
 * ------------------------------------------------------------------ */
function createBinaryWithBoxes(
  rows: number,
  cols: number,
  boxes: Rect[],
): Mat {
  // Start with a completely black matrix.
  const mat = new cv.Mat(rows, cols, cv.CV_8UC1, new cv.Scalar(0));

  // Draw each rectangle (filled white).
  boxes.forEach((box) => {
    // Guard against out‑of‑bounds coordinates.
    const x0 = Math.max(0, box.x);
    const y0 = Math.max(0, box.y);
    const w = Math.min(box.width, cols - x0);
    const h = Math.min(box.height, rows - y0);
    const roi = mat.roi(new cv.Rect(x0, y0, w, h));
    roi.setTo(new cv.Scalar(255));
    roi.delete();
  });

  return mat;
}

/* ------------------------------------------------------------------
 *  Test suite – AAA style
 * ------------------------------------------------------------------ */
describe('symbol‑segmentation.mts – extracting bounding boxes from a binary mask', () => {
  // ---------------------------------------------------------------
  // 1️⃣  Single isolated symbol
  // ---------------------------------------------------------------
  test('detects a single white rectangle as one bounding box', () => {
    // ---------- Arrange ----------
    const rows = 40;
    const cols = 40;
    const symbolBox: Rect = { x: 10, y: 12, width: 8, height: 6 };
    const binary = createBinaryWithBoxes(rows, cols, [symbolBox]);

    writeImageToConsole('single symbol (binary)', binary);

    // ---------- Act ----------
    const boxes = segmentSymbols(binary);

    // ---------- Assert ----------
    expect(boxes).toHaveLength(1);
    const detected = boxes[0];

    // The detector may return a box that is a few pixels larger due to
    // contour padding, so we allow a tolerance of ±1 pixel on each side.
    const tolerance = 1;
    expect(Math.abs(detected.x - symbolBox.x)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(detected.y - symbolBox.y)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(detected.width - symbolBox.width)).toBeLessThanOrEqual(2 * tolerance);
    expect(Math.abs(detected.height - symbolBox.height)).toBeLessThanOrEqual(2 * tolerance);

    // Clean up
    binary.delete();
  });

  // ---------------------------------------------------------------
  // 2️⃣  Multiple symbols of different sizes
  // ---------------------------------------------------------------
  test('detects several symbols and returns a bounding box for each', () => {
    // ---------- Arrange ----------
    const rows = 80;
    const cols = 80;
    const boxesToDraw: Rect[] = [
      { x: 5,  y: 5,  width: 6,  height: 6 },   // small square
      { x: 30, y: 20, width: 12, height: 8 },   // medium rectangle
      { x: 55, y: 50, width: 18, height: 14 },  // larger rectangle
    ];
    const binary = createBinaryWithBoxes(rows, cols, boxesToDraw);
    writeImageToConsole('multiple symbols (binary)', binary);

    // ---------- Act ----------
    const detectedBoxes = segmentSymbols(binary);

    // ---------- Assert ----------
    expect(detectedBoxes).toHaveLength(boxesToDraw.length);

    // For each expected box, make sure there is a detected box that
    // overlaps it sufficiently (IoU > 0.7).  This is more robust than
    // exact coordinate equality because some implementations pad the
    // contour by a pixel.
    const iou = (a: Rect, b: Rect): number => {
      const ix = Math.max(a.x, b.x);
      const iy = Math.max(a.y, b.y);
      const iw = Math.min(a.x + a.width, b.x + b.width) - ix;
      const ih = Math.min(a.y + a.height, b.y + b.height) - iy;
      if (iw <= 0 || ih <= 0) return 0;
      const inter = iw * ih;
      const union = a.width * a.height + b.width * b.height - inter;
      return inter / union;
    };

    boxesToDraw.forEach((expected) => {
      const match = detectedBoxes.some((det) => iou(det, expected) > 0.7);
      expect(match).toBe(true);
    });

    // Clean up
    binary.delete();
  });

  // ---------------------------------------------------------------
  // 3️⃣  Noise pixels that should be filtered out (size < 5 pixels)
  // ---------------------------------------------------------------
  test('ignores isolated noise pixels that are smaller than the minimum size', () => {
    // ---------- Arrange ----------
    const rows = 50;
    const cols = 50;
    // One legitimate symbol (10×8) and a few single‑pixel noise spots.
    const legitBox: Rect = { x: 20, y: 20, width: 10, height: 8 };
    const binary = createBinaryWithBoxes(rows, cols, [legitBox]);

    // Sprinkle 8 random isolated white pixels (noise).
    const rng = (max: number) => Math.floor(Math.random() * max);
    for (let i = 0; i < 8; i++) {
      const nx = rng(cols);
      const ny = rng(rows);
      binary.ucharPtr(ny, nx)[0] = 255;
    }

    writeImageToConsole('symbol + noise (binary)', binary);

    // ---------- Act ----------
    const boxes = segmentSymbols(binary);

    // ---------- Assert ----------
    // The implementation you have (see the original repo) filters out
    // contours with an area < 5 pixels, so we expect **only the legit**
    // symbol to survive.
    expect(boxes).toHaveLength(1);
    const detected = boxes[0];
    const tolerance = 1;
    expect(Math.abs(detected.x - legitBox.x)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(detected.y - legitBox.y)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(detected.width - legitBox.width)).toBeLessThanOrEqual(2 * tolerance);
    expect(Math.abs(detected.height - legitBox.height)).toBeLessThanOrEqual(2 * tolerance);

    // Clean up
    binary.delete();
  });

  // ---------------------------------------------------------------
  // 4️⃣  Empty image (no white pixels) → should return an empty array
  // ---------------------------------------------------------------
  test('returns an empty array when the binary mask contains no symbols', () => {
    // ---------- Arrange ----------
    const rows = 30;
    const cols = 30;
    const binary = new cv.Mat(rows, cols, cv.CV_8UC1, new cv.Scalar(0));
    writeImageToConsole('empty binary (no symbols)', binary);

    // ---------- Act ----------
    const boxes = segmentSymbols(binary);

    // ---------- Assert ----------
    expect(boxes).toEqual([]); // empty array

    // Clean up
    binary.delete();
  });
});