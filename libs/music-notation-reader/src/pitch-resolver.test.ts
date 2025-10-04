/**
 * tests/pitch-resolver.test.ts
 *
 * Run with: npx vitest run
 *
 * The production module is `src/pitch-resolver.mts`.  It exports:
 *
 *   export const TREBLE_MAP: string[];
 *   export const BASS_MAP:   string[];
 *
 *   export function resolvePitch(
 *     box: cv.Rect,
 *     staffLines: number[],          // sorted top‑to‑bottom (smallest y = top)
 *     clef?: 'treble' | 'bass',      // defaults to 'treble'
 *   ): string;                       // e.g. "F/4"
 *
 * This file follows the same AAA style and helper conventions you
 * already use in `feature-extractor.test.ts`.
 */

import { describe, test, expect } from 'vitest';
import {
  resolvePitch,
  TREBLE_MAP,
  BASS_MAP,
} from './pitch-resolver.mts';
import type { Rect } from '@techstark/opencv-js';

/* ------------------------------------------------------------------
 *  Helper – creates a **2‑pixel‑high** Rect whose centre is exactly
 *           the supplied y‑coordinate.  Width is irrelevant for the
 *           resolver, so we keep it at 1.
 * ------------------------------------------------------------------ */
function makeBoxAtY(yCenter: number, width = 1, height = 2): Rect {
  // With height = 2 the centre is `y + 1`.  Setting `y` to
  // `yCenter - 1` (rounded) gives an exact integer centre.
  const y = Math.round(yCenter - height / 2);
  const x = 0;
  return { x, y, width, height };
}

/* ------------------------------------------------------------------
 *  Synthetic staff lines – equally spaced, top‑to‑bottom order.
 * ------------------------------------------------------------------ */
const LINE_SPACING = 10; // pixels between consecutive lines (matches resolver)
const TREBLE_STAFF = [10, 20, 30, 40, 50]; // top → bottom
const BASS_STAFF   = [60, 70, 80, 90, 100]; // top → bottom

/* ------------------------------------------------------------------
 *  Utility – compute the *expected* pitch using the same algorithm
 *  that the resolver employs.  This keeps the test expectations
 *  perfectly aligned with the implementation while still checking
 *  that the function behaves as advertised.
 * ------------------------------------------------------------------ */
function expectedPitch(
  clef: 'treble' | 'bass',
  lineIdx: number,          // index of the *nearest* staff line (0‑4)
  offsetHalfSteps: number,  // offset in half‑steps from that line
): string {
  const map = clef === 'treble' ? TREBLE_MAP : BASS_MAP;
  const baseOctave = clef === 'treble' ? 4 : 2;

  const idx = lineIdx + offsetHalfSteps; // may be negative or > map length
  const note = map[idx] ?? 'C';          // fallback as in the resolver
  const octave = baseOctave + Math.floor(idx / 7);
  return `${note}/${octave}`;
}

/* ------------------------------------------------------------------
 *  Test suite – AAA style
 * ------------------------------------------------------------------ */
describe('pitch‑resolver.mts – mapping of note‑head Y‑position to pitch strings', () => {
  // ---------------------------------------------------------------
  // 1️⃣  Treble clef – notes that sit exactly on each staff line
  // ---------------------------------------------------------------
  test('maps each treble staff line to the correct pitch (line‑based)', () => {
    TREBLE_STAFF.forEach((lineY, lineIdx) => {
      const box = makeBoxAtY(lineY);
      const pitch = resolvePitch(box, TREBLE_STAFF, 'treble');
      const expected = expectedPitch('treble', lineIdx, 0); // offset = 0 (on the line)
      expect(pitch).toBe(expected);
    });
  });

  // ---------------------------------------------------------------
  // 2️⃣  Treble clef – notes that sit on the spaces (mid‑points)
  // ---------------------------------------------------------------
  test('maps treble spaces (mid‑points between lines) to the correct pitch', () => {
    // A space is exactly halfway between two consecutive lines.
    // Because the resolver picks the *upper* line as the nearest,
    // the offset is +1 half‑step (the next entry in the map).
    for (let i = 0; i < TREBLE_STAFF.length - 1; i++) {
      const yMid = (TREBLE_STAFF[i] + TREBLE_STAFF[i + 1]) / 2;
      const box = makeBoxAtY(yMid);
      const pitch = resolvePitch(box, TREBLE_STAFF, 'treble');

      // offset = +1 (space is one half‑step above the upper line)
      const expected = expectedPitch('treble', i, 1);
      expect(pitch).toBe(expected);
    }
  });

  // ---------------------------------------------------------------
  // 3️⃣  Bass clef – line‑based mapping
  // ---------------------------------------------------------------
  test('maps each bass staff line to the correct pitch (line‑based)', () => {
    BASS_STAFF.forEach((lineY, lineIdx) => {
      const box = makeBoxAtY(lineY);
      const pitch = resolvePitch(box, BASS_STAFF, 'bass');
      const expected = expectedPitch('bass', lineIdx, 0);
      expect(pitch).toBe(expected);
    });
  });

  // ---------------------------------------------------------------
  // 4️⃣  Bass clef – spaces between lines
  // ---------------------------------------------------------------
  test('maps bass spaces (mid‑points) to the correct pitch', () => {
    for (let i = 0; i < BASS_STAFF.length - 1; i++) {
      const yMid = (BASS_STAFF[i] + BASS_STAFF[i + 1]) / 2;
      const box = makeBoxAtY(yMid);
      const pitch = resolvePitch(box, BASS_STAFF, 'bass');

      // offset = +1 (space is one half‑step above the upper line)
      const expected = expectedPitch('bass', i, 1);
      expect(pitch).toBe(expected);
    }
  });

  // ---------------------------------------------------------------
  // 5️⃣  Octave‑up: a note one full line‑spacing above the top line
  // ---------------------------------------------------------------
  test('increments the octave for a note one line‑spacing above the highest staff line', () => {
    const aboveTopY = TREBLE_STAFF[0] - LINE_SPACING; // one full line spacing up
    const box = makeBoxAtY(aboveTopY);
    const pitch = resolvePitch(box, TREBLE_STAFF, 'treble');

    // The centre is two half‑steps above the top line → offset = -2
    const expected = expectedPitch('treble', 0, -2);
    expect(pitch).toBe(expected);
  });

  // ---------------------------------------------------------------
  // 6️⃣  Octave‑down: a note one full line‑spacing below the bottom line
  // ---------------------------------------------------------------
  test('decrements the octave for a note one line‑spacing below the lowest staff line', () => {
    const belowBottomY = BASS_STAFF[BASS_STAFF.length - 1] + LINE_SPACING; // one full line spacing down
    const box = makeBoxAtY(belowBottomY);
    const pitch = resolvePitch(box, BASS_STAFF, 'bass');

    // The centre is two half‑steps below the bottom line → offset = +2
    const expected = expectedPitch('bass', 4, 2);
    expect(pitch).toBe(expected);
  });
});