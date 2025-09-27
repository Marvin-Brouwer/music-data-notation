/**
 * tests/duration-resolver.test.ts
 *
 * Run with: npx vitest run
 *
 * The production file is `src/duration-resolver.mts`.
 * It exports a single function:
 *
 *   export function resolveDuration(label: string): string
 *
 * The function maps the textual label coming from the classifier
 * (e.g. "quarter", "rest_half") to the VexFlow duration token
 * ("q", "h", "qr", …).  Any label that is not recognised should
 * fall back to a sensible default (we use "q" – a quarter note).
 */

import { describe, test, expect } from 'vitest';
import { resolveDuration } from './duration-resolver.mts';

// ---------------------------------------------------------------------
// Helper – a tiny wrapper that makes the intention of each test clear.
// ---------------------------------------------------------------------
function mapLabel(label: string): string {
  // Act – call the production code
  return resolveDuration(label);
}

// ---------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------
describe('duration‑resolver.mts – label → VexFlow duration mapping', () => {
  // ---------------------------------------------------------------
  // 1️⃣  Direct mappings for notes
  // ---------------------------------------------------------------
  test('maps "whole" to VexFlow "w"', () => {
    // Arrange
    const label = 'whole';

    // Act
    const duration = mapLabel(label);

    // Assert
    expect(duration).toBe('w');
  });

  test('maps "half" to VexFlow "h"', () => {
    const label = 'half';
    const duration = mapLabel(label);
    expect(duration).toBe('h');
  });

  test('maps "quarter" to VexFlow "q"', () => {
    const label = 'quarter';
    const duration = mapLabel(label);
    expect(duration).toBe('q');
  });

  test('maps "eighth" to VexFlow "8"', () => {
    const label = 'eighth';
    const duration = mapLabel(label);
    expect(duration).toBe('8');
  });

  test('maps "sixteenth" to VexFlow "16"', () => {
    const label = 'sixteenth';
    const duration = mapLabel(label);
    expect(duration).toBe('16');
  });

  // ---------------------------------------------------------------
  // 2️⃣  Rest mappings (suffix “r” for VexFlow rests)
  // ---------------------------------------------------------------
  test('maps "rest_whole" to VexFlow "wr"', () => {
    const label = 'rest_whole';
    const duration = mapLabel(label);
    expect(duration).toBe('wr');
  });

  test('maps "rest_half" to VexFlow "hr"', () => {
    const label = 'rest_half';
    const duration = mapLabel(label);
    expect(duration).toBe('hr');
  });

  test('maps "rest_quarter" to VexFlow "qr"', () => {
    const label = 'rest_quarter';
    const duration = mapLabel(label);
    expect(duration).toBe('qr');
  });

  test('maps "rest_eighth" to VexFlow "8r"', () => {
    const label = 'rest_eighth';
    const duration = mapLabel(label);
    expect(duration).toBe('8r');
  });

  // ---------------------------------------------------------------
  // 3️⃣  Unknown / unsupported label – should fall back to a safe default
  // ---------------------------------------------------------------
  test('returns a default ("q") for an unrecognised label', () => {
    // Arrange – a label that does not exist in the switch‑case
    const label = 'foobar_not_a_note';

    // Act
    const duration = mapLabel(label);

    // Assert – the implementation should return a sane fallback.
    // Here we expect the fallback to be a quarter note ("q").
    expect(duration).toBe('q');
  });

  // ---------------------------------------------------------------
  // 4️⃣  Case‑insensitivity check (optional but handy)
  // ---------------------------------------------------------------
  test('handles mixed‑case input gracefully', () => {
    const label = 'QuArTeR'; // mixed case
    const duration = mapLabel(label);
    // The resolver should normalise the string internally.
    expect(duration).toBe('q');
  });
});