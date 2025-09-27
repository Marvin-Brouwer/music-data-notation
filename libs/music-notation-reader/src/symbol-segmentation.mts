/**
 * Responsibility
 * Remove staff lines, isolate connected components (notes, rests, clefs).
 * 
 * Where the C# repo helps
 * RemoveStaffLines and ExtractSymbols from the repo.
 * 
 * What you’ll implement yourself
 * After line removal, run cv.findContours on the binary image; each contour → bounding box.
 */

import cv from '@techstark/opencv-js';

export async function segmentSymbols(noStaff: cv.Mat): Promise<cv.Rect[]> {

  // Find contours (external only)
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(
    noStaff,
    contours,
    hierarchy,
    cv.RETR_EXTERNAL,
    cv.CHAIN_APPROX_SIMPLE,
  );

  const boxes: cv.Rect[] = [];
  for (let i = 0; i < contours.size(); ++i) {
    const cnt = contours.get(i);
    const rect = cv.boundingRect(cnt);
    // Filter out tiny noise blobs (e.g., < 5×5 px)
    if (rect.width > 5 && rect.height > 5) boxes.push(rect);
    cnt.delete();
  }
  contours.delete(); hierarchy.delete();
  return boxes;
}