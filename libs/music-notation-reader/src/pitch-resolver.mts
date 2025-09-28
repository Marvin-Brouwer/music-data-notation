/**
 * Responsibility
 * Given a note head’s vertical position relative to detected staff lines, infer pitch (A‑G + octave).
 * 
 * Where the C# repo helps
 * GetPitchFromY logic in the repo.
 * 
 * What you’ll implement yourself
 * Compute distance from the nearest staff line, map to diatonic steps, adjust for clef (use a simple enum).
 */

import type { Rect } from '@techstark/opencv-js';

export function resolvePitch(
  box: Rect,
  staffLines: number[],
  clef: 'treble' | 'bass' = 'treble',
): string {
  // Assume staffLines are sorted top‑to‑bottom.
  const lineSpacing = (staffLines[4] - staffLines[0]) / 4; // average distance
  const centerY = box.y + box.height / 2;

  // Find nearest staff line index
  let nearestIdx = 0;
  let minDist = Infinity;
  staffLines.forEach((y, i) => {
    const d = Math.abs(centerY - y);
    if (d < minDist) {
      minDist = d;
      nearestIdx = i;
    }
  });

  // Compute offset in half‑steps (each line/space = 1 step)
  const offset = Math.round((centerY - staffLines[nearestIdx]) / (lineSpacing / 2));
  // Map offset to note name based on clef
  const trebleMap = ['F', 'E', 'D', 'C', 'B', 'A', 'G', 'F', 'E']; // line 0 = F4, etc.
  const bassMap   = ['A', 'G', 'F', 'E', 'D', 'C', 'B', 'A', 'G'];

  const map = clef === 'treble' ? trebleMap : bassMap;
  const idx = nearestIdx + offset;
  const note = map[idx] ?? 'C'; // fallback
  const octave = clef === 'treble' ? 4 + Math.floor(idx / 7) : 2 + Math.floor(idx / 7);
  return `${note}/${octave}`;
}