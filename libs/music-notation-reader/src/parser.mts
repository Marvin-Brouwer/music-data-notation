/**
 * Responsibility
 * Public API: parseSheetMusic(imageData: ImageData): Promise<StaveNoteStruct[]>.
 * 
 * Where the C# repo helps
 * Orchestrates the pipeline.
 * 
 * What you’ll implement yourself
 * Handles async loading of OpenCV, error handling, and returns the final array.
 */

import cv, { type ImageData} from '@techstark/opencv-js';

import { preprocess } from './preprocess.mts';
import { detectStaffLines, removeStaffLines } from './staff-detector.mts';
import { segmentSymbols } from './symbol-segmentation.mts';
import { extractFeatures } from './feature-extractor.mts';
import { classify } from './classifier.mts';
import { resolvePitch } from './pitch-resolver.mts';
import { buildVexflowNotes, type ParsedNote } from './vexflow-builder.mts';

export async function parseSheetMusic(
  img: ImageData,
  opts?: { clef?: 'treble' | 'bass' },
): Promise<ParsedNote[]> {
  // 1️⃣ Pre‑process → binary image
  const binary = await preprocess(img);

  // 2️⃣ Detect staff lines
  const staffLines = await detectStaffLines(binary);
  if (staffLines.length < 5) {
    // console.warn('Could not locate a full staff – returning empty result.');
    binary.delete();
    return [];
  }

  // 3️⃣ Remove staff lines (helps contour extraction)
  const noStaff = await removeStaffLines(binary, staffLines);
  binary.delete(); // free the original binary mat

  // 4️⃣ Segment symbols (bounding boxes)
  const boxes = await segmentSymbols(noStaff);
  noStaff.delete();

  // 5️⃣ For each box: extract features → classify → pitch (if note)
  const detections: {
    box: cv.Rect;
    label: string;
    pitch?: string;
  }[] = [];

  for (const box of boxes) {
    const feats = await extractFeatures(binary, box); // binary still alive here
    const label = classify(feats);
    let pitch: string | undefined;

    if (!label.startsWith('rest') && !label.includes('clef')) {
      // Assume a note head – compute pitch
      pitch = resolvePitch(box, staffLines, opts?.clef ?? 'treble');
    }

    detections.push({ box, label, pitch });
  }

  // 6️⃣ Build VexFlow structs (only the data, no rendering)
  const vexNotes = buildVexflowNotes(detections);
  return vexNotes;
}
