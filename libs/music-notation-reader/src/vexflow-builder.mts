/**
 * Responsibility
 * Assemble StaveNoteStruct objects (or minimal custom interface mirroring VexFlow).
 * 
 * Where the C# repo helps
 * Not present in the repo – you’ll create this.
 * 
 * What you’ll implement yourself
 * Export an array of { keys: string[], duration: string, clef?: string } that VexFlow can consume directly
 */

import cv from '@techstark/opencv-js';
import { resolveDuration } from './duration-resolver.mts';

export type ParsedNote = {
  keys: string[];        // e.g., ["c/4"]
  duration: string;      // VexFlow duration token
  clef?: string;         // optional
}

/**
 * Convert raw detections into VexFlow structs.
 */
export function buildVexflowNotes(detections: {
  box: cv.Rect;
  label: string;
  pitch?: string;
}[]): ParsedNote[] {
  const notes: ParsedNote[] = [];

  for (const det of detections) {
    if (det.label.startsWith('rest')) {
      notes.push({
        keys: ['b/4'], // placeholder (rests ignore pitch)
        duration: resolveDuration(det.label),
      });
      continue;
    }

    if (!det.pitch) continue; // safety

    notes.push({
      keys: [det.pitch],
      duration: resolveDuration(det.label),
    });
  }
  return notes;
}