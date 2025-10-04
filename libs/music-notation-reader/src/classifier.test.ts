/**
 * tests/classifier.test.ts
 *
 * Run with: npx vitest run
 *
 * The production file is `src/classifier.mts`.
 * It expects a `SymbolFeatures` object and returns a string label
 * based on the prototype data stored in `src/prototypes.json`.
 */

import { describe, test, expect } from 'vitest';
import { classify } from './classifier.mts';

// ---------------------------------------------------------------------
// Helper: a tiny wrapper that mimics the shape of the real feature set.
// ---------------------------------------------------------------------
interface SymbolFeatures {
  aspectRatio: number;
  filledRatio: number;
  holes: number;
}

// ---------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------
describe('classifier.mts – prototype‑based nearest‑neighbour', () => {
  // ---------------------------------------------------------------
  // 1️⃣  Known‑prototype cases
  // ---------------------------------------------------------------
  test('recognises a quarter‑note head', () => {
    // Arrange – create a feature vector that matches the "quarter"
    // prototype (see prototypes.json). Values are deliberately
    // a little off to simulate real‑world measurement noise.
    const features: SymbolFeatures = {
      aspectRatio: 0.96,   // prototype: 0.95
      filledRatio: 0.84,   // prototype: 0.85
      holes: 0,            // prototype: 0
    };

    // Act – run the classifier
    const label = classify(features);

    // Assert – we expect the quarter‑note label
    expect(label).toBe('quarter');
  });

  test('recognises a whole‑note head (hollow)', () => {
    const features: SymbolFeatures = {
      aspectRatio: 1.02,   // prototype: 1.00
      filledRatio: 0.31,   // prototype: 0.30
      holes: 1,            // prototype: 1
    };

    const label = classify(features);
    expect(label).toBe('whole');
  });

  test('recognises a treble clef glyph', () => {
    const features: SymbolFeatures = {
      aspectRatio: 0.54,   // prototype: 0.55
      filledRatio: 0.66,   // prototype: 0.65
      holes: 0,
    };

    const label = classify(features);
    expect(label).toBe('clef_treble');
  });

  test('recognises a sharp accidental', () => {
    const features: SymbolFeatures = {
      aspectRatio: 0.31,   // prototype: 0.30
      filledRatio: 0.71,   // prototype: 0.70
      holes: 0,
    };

    const label = classify(features);
    expect(label).toBe('accidental_sharp');
  });

  // ---------------------------------------------------------------
  // 2️⃣  Unknown / out‑of‑distribution case
  // ---------------------------------------------------------------
  test('returns "unknown" for a feature vector far from any prototype', () => {
    // Arrange – a bizarre shape that does not exist in the DB
    const features: SymbolFeatures = {
      aspectRatio: 2.5,   // far outside any realistic music glyph
      filledRatio: 0.1,
      holes: 5,
    };

    // Act
    const label = classify(features);

    // Assert – the classifier should fall back to the sentinel value
    expect(label).toBe('unknown');
  });

  // ---------------------------------------------------------------
  // 3️⃣  Boundary‑threshold test (optional but useful)
  // ---------------------------------------------------------------
  test('still recognises a quarter‑note when distance is just under the threshold', () => {
    // Arrange – perturb the quarter prototype just enough to be
    // close to the 0.05 distance limit used in classifier.ts.
    const features: SymbolFeatures = {
      aspectRatio: 0.90,   // diff = 0.05
      filledRatio: 0.80,   // diff = 0.05
      holes: 0,
    };
    // Euclidean distance ≈ sqrt(0.05² + 0.05²) ≈ 0.0707 → exceeds 0.05,
    // so we intentionally make it a bit tighter:
    const tighterFeatures: SymbolFeatures = {
      aspectRatio: 0.93,   // diff = 0.02
      filledRatio: 0.83,   // diff = 0.02
      holes: 0,
    };

    // Act
    const label = classify(tighterFeatures);

    // Assert
    expect(label).toBe('quarter');
  });
});