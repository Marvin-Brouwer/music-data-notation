/**
 * Responsibility
 * Compute simple geometric descriptors (aspect ratio, hole count, centroid).
 * 
 * Where the C# repo helps
 * The repo uses a handcrafted feature vector for k‑NN.
 * 
 * What you’ll implement yourself
 * Replicate those descriptors in TS; they are cheap (pixel counts, moments).
 */

import type { Mat, Rect } from '@techstark/opencv-js';
import cv from './open-cv-bootstrap.mts';

export interface SymbolFeatures {
  aspectRatio: number;   // width / height
  filledRatio: number;   // foreground pixels / area
  holes: number;         // number of internal contours (for whole notes)
  // Add more if needed (e.g., moments)
}

export function extractFeatures(
  bin: Mat,
  box: Rect,
): SymbolFeatures {

  const roi = bin.roi(box);
  const area = box.width * box.height;

  // Filled ratio
  const whiteCount = cv.countNonZero(roi);
  const filledRatio = whiteCount / area;

  // Aspect ratio
  const aspectRatio = box.width / box.height;

  // Hole count – find contours inside ROI
  const innerContours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(
    roi,
    innerContours,
    hierarchy,
    cv.RETR_CCOMP,
    cv.CHAIN_APPROX_SIMPLE,
  );
  const holes = innerContours.size() - 1; // first contour is outer boundary
  innerContours.delete(); hierarchy.delete();
  roi.delete();

  return { aspectRatio, filledRatio, holes };
}