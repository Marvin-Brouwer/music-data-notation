// tests/omr.test.ts
import { describe, it, expect } from 'vitest';
import { imageDataToMusicXML } from './omr.alt';

// Helper: create a tiny black‑and‑white test image (e.g., a single quarter note)
// For the demo we just draw a simple black rectangle – the OMR engine will
// still produce a valid MusicXML (it may be empty, but the call succeeds).
function makeMockImageData(): ImageData {
  const width = 200;
  const height = 100;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // black rectangle that mimics a note head
  ctx.fillStyle = '#000000';
  ctx.fillRect(80, 40, 20, 20);

  // Return the raw ImageData (RGBA)
  return ctx.getImageData(0, 0, width, height);
}

describe('omrmarkengine via Pyodide', () => {
  it('should return a non‑empty MusicXML string', async () => {
    const img = makeMockImageData();

    const xml = await imageDataToMusicXML(img);
    console.log('test', xml)

    // Basic sanity checks – the string must contain the MusicXML root tag
    expect(typeof xml).toBe('string');
    expect(xml.length).toBeGreaterThan(0);
    expect(xml).toContain('<score-partwise');
  }, 30_000); // increase timeout because loading Pyodide can take a few seconds
});