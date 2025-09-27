/**
 * Responsibility
 * Detect staff lines, group them into systems, compute line spacing.
 * 
 * Where the C# repo helps
 * The repo’s DetectStaffLines (Hough transform + projection profile).
 * 
 * What you’ll implement yourself
 * Implement a fast projection‑profile method in JS: sum pixel values per row, find peaks, then refine with cv.HoughLinesP.
 */
import cv from '@techstark/opencv-js';

export async function detectStaffLines(bin: cv.Mat): Promise<number[]> {

  // Horizontal projection profile
  const rows = bin.rows;
  const cols = bin.cols;
  const profile = new Uint32Array(rows);
  for (let y = 0; y < rows; ++y) {
    let sum = 0;
    for (let x = 0; x < cols; ++x) {
      sum += bin.ucharPtr(y, x)[0]; // binary = 0/255
    }
    profile[y] = sum;
  }

  // Find peaks (lines) – simple threshold on profile
  const maxVal = Math.max(...profile);
  const thresh = maxVal * 0.6; // empirical
  const lineRows: number[] = [];
  for (let y = 0; y < rows; ++y) {
    if (profile[y] > thresh) lineRows.push(y);
  }

  // Group nearby rows into a single line (within 2‑3 px)
  const grouped: number[] = [];
  let curGroup: number[] = [];
  for (const r of lineRows) {
    if (curGroup.length && r - curGroup[curGroup.length - 1] > 3) {
      grouped.push(Math.round(curGroup.reduce((a, b) => a + b) / curGroup.length));
      curGroup = [];
    }
    curGroup.push(r);
  }
  if (curGroup.length) grouped.push(Math.round(curGroup.reduce((a, b) => a + b) / curGroup.length));

  return grouped; // e.g., [12, 22, 32, 42, 52, …] (five lines per staff)
}

export async function removeStaffLines(bin: cv.Mat, lines: number[]): Promise<cv.Mat> {
  const result = bin.clone();

  // Dilate a thin horizontal structuring element over each line row
  const lineMask = cv.Mat.zeros(bin.rows, bin.cols, cv.CV_8UC1);
  const thickness = 1; // usually 1‑pixel thick after binarisation
  for (const y of lines) {
    const row = lineMask.rowRange(y - thickness, y + thickness + 1);
    row.setTo(new cv.Scalar(255));
  }

  // Subtract the mask
  cv.subtract(result, lineMask, result);
  lineMask.delete();
  return result;
}