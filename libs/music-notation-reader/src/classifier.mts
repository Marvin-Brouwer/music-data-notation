/**
 * Responsibility
 * Map descriptor → symbol class (note head, whole/rest, clef, accidental).
 * 
 * Where the C# repo helps
 * The repo’s KNearestClassifier.
 * 
 * What you’ll implement yourself
 * Replace the heavy k‑NN with a tiny lookup table + Euclidean distance; store prototype vectors in a JSON file (≈ few KB).
 */


import prototypes from './prototypes.json' assert { type: 'json' }; 

import type { SymbolFeatures } from './feature-extractor.mts';

export function classify(features: SymbolFeatures): string {
  // Euclidean distance to each prototype
  let bestLabel = 'unknown';
  let bestDist = Infinity;
  for (const p of prototypes) {
    const d =
      Math.pow(features.aspectRatio - p.features.aspectRatio, 2) +
      Math.pow(features.filledRatio - p.features.filledRatio, 2) +
      Math.pow(features.holes - p.features.holes, 2);
    if (d < bestDist) {
      bestDist = d;
      bestLabel = p.label;
    }
  }
  // Simple threshold to reject garbage
  return bestDist < 0.05 ? bestLabel : 'unknown';
}