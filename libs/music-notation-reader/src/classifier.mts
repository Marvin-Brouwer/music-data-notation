/**
 * classifier.mts
 *
 * Responsibility
 *   Map a SymbolFeatures descriptor → a symbol class label.
 *
 *   The original C# repo used a K‑Nearest‑Neighbour classifier.
 *   Here we replace it with a tiny lookup‑table + Euclidean distance.
 *
 *   Prototypes are stored in ./prototypes.json (a few KB at most).
 */

import prototypes from './prototypes.full.json' assert { type: 'json' };
import type { SymbolFeatures } from './feature-extractor.mts';

/**
 * Classify a SymbolFeatures vector by finding the nearest prototype.
 *
 * @param features  The three geometric descriptors produced by
 *                  `feature-extractor.ts` (aspectRatio, filledRatio,
 *                  holes).
 * @returns         The label of the closest prototype, or `'unknown'`
 *                  if the Euclidean distance is larger than the
 *                  acceptance threshold (0.05).
 */
export function classify(features: SymbolFeatures): string {
  // Initialise with a sentinel that will be overwritten by the first prototype.
  let bestLabel = 'unknown';
  let bestDist = Infinity; // Euclidean distance (not squared)

  for (const p of prototypes) {
    // Squared differences for each dimension.
    const dSq =
      Math.pow(features.aspectRatio - p.features.aspectRatio, 2) +
      Math.pow(features.filledRatio - p.features.filledRatio, 2) +
      Math.pow(features.holes - p.features.holes, 2);

    // Convert to Euclidean distance.
    const dist = Math.sqrt(dSq);

    // Keep the prototype with the smallest Euclidean distance.
    if (dist < bestDist) {
      bestDist = dist;
      bestLabel = p.label;
    }
  }

  // Acceptance threshold – if the nearest neighbour is farther than
  // 0.05 (in Euclidean space) we treat the glyph as unknown.
  return bestDist < 0.05 ? bestLabel : 'unknown';
}