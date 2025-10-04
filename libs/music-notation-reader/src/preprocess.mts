/**
 * src/preprocess.debug.mts
 *
 * A drop‑in replacement for `src/preprocess.mts` that logs the
 * intermediate OpenCV‑JS matrices to the console.
 *
 *   - The function still returns the final binary mask (`cv.Mat`).
 *   - All intermediate Mats are printed as ASCII art (using the
 *     `writeImageToConsole` helper you already have).
 *   - The caller is still responsible for deleting the returned
 *     matrix (`binary.delete()`), but the intermediate mats are
 *     cleaned up automatically.
 *
 * You can import this file only in your test environment:
 *
 *   import { preprocess } from './preprocess.debug.mts';
 *
 * In production you would keep using the original `src/preprocess.mts`.
 */

import cv from './open-cv-bootstrap.mts';
import type { ImageData, Mat } from '@techstark/opencv-js';
import { writeImageToConsole } from './debug-tools/mat-debug.mts';

/**
 * Convert an ImageData → binary mask while printing each step.
 *
 * @param img   The RGBA ImageData you want to preprocess.
 * @returns     The final binary mask (`cv.Mat`, CV_8UC1).  Caller must
 *              call `.delete()` on the returned matrix.
 */
export function preprocess(img: ImageData): Mat {
  // -----------------------------------------------------------------
  // 1️⃣  ImageData → RGBA Mat
  // -----------------------------------------------------------------
  const src = cv.matFromImageData(img);

  // -----------------------------------------------------------------
  // 2️⃣  Grayscale conversion
  // -----------------------------------------------------------------
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  writeImageToConsole('2️⃣ gray (1‑ch)', gray);

  // -----------------------------------------------------------------
  // 3️⃣  Gaussian blur (5×5 kernel)
  // -----------------------------------------------------------------
  const blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
  writeImageToConsole('3️⃣ blurred (1‑ch)', blurred);

  // -----------------------------------------------------------------
  // 4️⃣  Adaptive threshold (inverse binary)
  // -----------------------------------------------------------------
  const binary = new cv.Mat();
  cv.adaptiveThreshold(
    blurred,
    binary,
    255,
    cv.ADAPTIVE_THRESH_MEAN_C,
    cv.THRESH_BINARY_INV, // keep the flag you originally used
    15,
    - 10,
  );
  writeImageToConsole('4️⃣ binary (after adaptiveThreshold)', binary);

  // -----------------------------------------------------------------
  // 5️⃣  Morphological opening (remove speckles)
  // -----------------------------------------------------------------
  const opened = new cv.Mat();
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
  cv.morphologyEx(binary, opened, cv.MORPH_OPEN, kernel);
  writeImageToConsole('5️⃣ opened (final output)', opened);

  // -----------------------------------------------------------------
  // 6️⃣  Clean up temporaries (src, gray, blurred, binary, kernel)
  // -----------------------------------------------------------------
  src.delete();
  gray.delete();
  blurred.delete();
  binary.delete();
  kernel.delete();

  // `opened` is the final mask that the caller will use.
  return opened;
}