/**
 * Responsibility
 * Convert ImageData → grayscale → binarize → noise removal (morphology).
 * 
 * Where the C# repo helps
 * The C# repo’s PreprocessImage method shows the sequence of filters (Gaussian blur → adaptive threshold).
 * 
 * What you’ll implement yourself
 * Use OpenCV‑JS equivalents (cv.cvtColor, cv.adaptiveThreshold, cv.morphologyEx).
 */

import type { ImageData, Mat } from '@techstark/opencv-js';
import cv from './open-cv-bootstrap.mts';

export function preprocess(img: ImageData): Mat {

  // Convert ImageData → cv.Mat
  const src = cv.matFromImageData(img);

  // Grayscale
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  // Gaussian blur (reduce noise)
  const blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

  // Adaptive threshold (binary)
  const binary = new cv.Mat();
  cv.adaptiveThreshold(
    blurred,
    binary,
    255,
    cv.ADAPTIVE_THRESH_MEAN_C,
    cv.THRESH_BINARY_INV,
    15,
    10,
  );

  // Optional morphological opening to remove speckles
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
  const opened = new cv.Mat();
  cv.morphologyEx(binary, opened, cv.MORPH_OPEN, kernel);

  // Clean up intermediate mats
  src.delete(); gray.delete(); blurred.delete(); binary.delete(); kernel.delete();

  return opened; // caller must .delete() when done
}