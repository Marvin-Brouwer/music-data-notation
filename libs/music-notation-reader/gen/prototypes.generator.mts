/**
 * src/utils/generate-prototypes.mts
 *
 * Generates PNGs and feature data for all note combinations.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { JSDOM } from 'jsdom';
import {
  BarlineType,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
  type StaveNoteStruct,
} from 'vexflow';
import { preprocess } from '../src/preprocess.mjs';
import { extractFeatures } from '../src/feature-extractor.mjs';
import { loadFont, patchCanvas, writeImage } from '@marvin-brouwer/tools';
import { readdir, rm } from 'fs/promises';

// ------------------------------------------------------------------
// 1️⃣  Types
// ------------------------------------------------------------------

(globalThis as any).LOG_IMAGES = false;
type NoteToDraw = StaveNoteStruct & {
  fileName: string;
  label: string
};

// ------------------------------------------------------------------
// 2️⃣  Constants & helpers
// ------------------------------------------------------------------

const CANVAS_H = 200;
const FONT_SCALE = 1.5;
const BASE_FONT_SIZE = 40;

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// ------------------------------------------------------------------
// 3️⃣  Minimal DOM shim
// ------------------------------------------------------------------

const html = `<!DOCTYPE html><html><body></body></html>`;
const dom = new JSDOM(html, { resources: 'usable', runScripts: 'dangerously' });
(global as any).window = dom.window;
(global as any).document = dom.window.document;

// ------------------------------------------------------------------
// 4️⃣  Canvas & font setup
// ------------------------------------------------------------------

type Prototype = {
  label: string;
  debugFile?: string;
  composition: StaveNoteStruct;
  features: {
    aspectRatio: number;
    filledRatio: number;
    holes: number;
  };
}

patchCanvas();
await loadFont(import.meta.resolve('vexflow-fonts/package.json'), './bravura/Bravura_1.392.woff2');

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d')!;

const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
const context = renderer.getContext();
const sizeStave = new Stave(0, 0, 100).setContext(context);
const sizeNote = new StaveNote({ keys: ["C/4"], duration: 'q' })
  .setContext(context);
Formatter.FormatAndDraw(context, sizeStave, [sizeNote])
canvas.width = ((sizeNote.getWidth() + sizeNote.getVoiceShiftWidth()) * 2) + sizeNote.getWidth()
canvas.height = sizeStave.getHeight()

// ------------------------------------------------------------------
// 5️⃣  Note generation setup
// ------------------------------------------------------------------


const rawNotes = [
  'B/3', 'C/4', 'D#/4', 'E/4', 'F/4', 'G#/4', 'A/4', 'B/4', 'C/5', 'D/5', 'E/5', 'F/5', 'G/5', 'A/5', 'B/5'
]

// TODO Figure out accidental rendering
const accidentals = ['', '#', 'b']; // natural, sharp, flat
const durations = ['1', '2', '4', '8', '16']; // note lengths
const noteTypes = ['n', 'x']; // normal, muted
const MAX_CHORD_SIZE = 7;

// ------------------------------------------------------------------
// 6️⃣  Glyph rendering
// ------------------------------------------------------------------

function expandDurations(note: StaveNoteStruct) {
  return durations.map(duration => ({ ...note, duration }))
}
function expandTypes(note: StaveNoteStruct) {
  return noteTypes.map(type => ({ ...note, type }))
}

async function renderGlyph(note: NoteToDraw, debugDir: string, writeDebugOutput: boolean): Promise<ImageData> {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${BASE_FONT_SIZE * FONT_SCALE}px Bravura`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#000';

  const stave = new Stave(0, 0, canvas.width)
    .setBegBarType(BarlineType.NONE)
    .setEndBarType(BarlineType.NONE)
    .setContext(context);

  // TODO maybe necessary when generating clefs and timing indicators
  // stave.draw();

  const staveNote = new StaveNote({
    keys: note.keys,
    duration: note.duration,
    type: note.type,
  }).setContext(context)

  Formatter.FormatAndDraw(context, stave, [staveNote]);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height) as ImageData;

  if (writeDebugOutput) {
    const pngPath = join(debugDir, note.fileName);
    writeImage(pngPath, imgData);
  }

  return imgData;
}

/**
 * Expand a note into all possible chord combinations drawn from the
 * window starting at `index` (window length = maxSize).
 *
 * - Always includes the singleton [note].
 * - Then returns every combination (subsets) of the window of sizes 2..m.
 * - Elements keep their original order.
 *
 * Example:
 *   collection = ['C4','D4','E4','F4'], index = 0, maxSize = 4
 *   -> returns [ ['C4'],
 *                ['C4','D4'], ['C4','E4'], ['C4','F4'],
 *                ['D4','E4'], ['D4','F4'], ['E4','F4'],
 *                ['C4','D4','E4'], ['C4','D4','F4'], ['C4','E4','F4'], ['D4','E4','F4'],
 *                ['C4','D4','E4','F4'] ]
 */
export function expandNotes(
  note: string,
  index: number,
  collection: string[]
): string[][] {
  // Guard: if index out of range, nothing to do
  if (index < 0 || index >= collection.length) return [];

  // Window starts at index and spans up to maxSize elements
  const window = collection.slice(index, index + Math.max(1, MAX_CHORD_SIZE));
  const n = window.length;
  if (n === 0) return [];

  const results: string[][] = [];

  // Always include the single base note (the user expectation)
  results.push([note]);

  // Helper: generate all combinations of indices of size `k` from [0..n-1]
  function combineIndices(k: number) {
    const combo: number[] = [];
    function helper(start: number, left: number) {
      if (left === 0) {
        // map index combo -> actual notes (preserving order)
        results.push(combo.map((i) => window[i]));
        return;
      }
      // choose next index i such that enough elements remain
      for (let i = start; i <= n - left; i++) {
        combo.push(i);
        helper(i + 1, left - 1);
        combo.pop();
      }
    }
    helper(0, k);
  }

  // Produce combos of size 2 .. n (but not 1, we already pushed [note])
  for (let size = 2; size <= n; size++) {
    combineIndices(size);
  }

  return results;
}


// ------------------------------------------------------------------
// 7️⃣  Main generation logic
// ------------------------------------------------------------------
export type GeneratePrototypeOptions = {
  writeDebugOutput?: boolean,
  cleanDebugFolder?: boolean,
  outputFile: string,
  overwrite?: boolean
}
export async function generatePrototypes(options: GeneratePrototypeOptions): Promise<void> {

  const outRoot = resolve(__dirname);
  const debugDir = join(outRoot, 'debug');
  const outputPath = join(outRoot, options.outputFile);

  if (!options.overwrite && existsSync(outputPath)) {
    console.log(`✅ Skipped generating prototypes, already existing: ${outputPath}`);
    return;
  }

  console.log('ensuring directories')
  ensureDir(debugDir);

  console.log('Generating note set')

  // Assemble the full coverage set
  const fullCoverageSet: NoteToDraw[] =
    // For now, have the rest in the middle untill we figure out if we can handle it
    expandNotes(rawNotes[4], 4, rawNotes)
      // TODO figure out how to make exapandNotes stop in time
      .filter(keys => keys[0] === rawNotes[4])
      .map(keys => ({ keys }) as StaveNoteStruct)
      .flatMap(expandDurations)
      .flatMap(expandTypes)
      .map(note => {

        const keyComposition = note.keys!.map(k => rawNotes.indexOf(k) - 4)
        const keyCompositionLabel = Array(7)
          .fill('')
          .map((_, i) => keyComposition.includes(i) ? 'o' : '-')
          .join('')
        return {
          ...note,
          label: `${keyCompositionLabel} ${note.type} ${note.duration}`,
          composition: note,
          fileName: `${keyCompositionLabel}.${note.type}.${note.duration}.png`
        } as NoteToDraw
      })


  if (options.cleanDebugFolder) {
    // Optional cleanup
    const debugFiles = (await readdir(debugDir))
      .filter((file) => file !== '.gitignore')
      .filter((file) => fullCoverageSet.findIndex(x => x.fileName === file) === -1);
    console.log('cleaning non-contender files', debugFiles)
    for (const file of debugFiles) await rm(join(debugDir, file));
  }

  const prototypes: Prototype[] = [];

  for (const staveNote of fullCoverageSet) {
    console.log('Rendering', staveNote.fileName);
    const imgData = await renderGlyph(staveNote, debugDir, options.writeDebugOutput ?? false);
    await new Promise<void>(r => setTimeout(r, 10));
    console.log('Processing', staveNote.fileName);
    const binaryMat = preprocess(imgData);
    await new Promise<void>(r => setTimeout(r, 10));
    console.log('Extracting', staveNote.fileName);
    const { aspectRatio, filledRatio, holes } = extractFeatures(binaryMat, {
      x: 0,
      y: 0,
      width: binaryMat.cols,
      height: binaryMat.rows,
    });

    const { label, fileName, ...rawStaveNote } = staveNote;
    prototypes.push({
      label,
      debugFile: options.writeDebugOutput ? fileName : undefined,
      composition: rawStaveNote,
      features: {
        aspectRatio: Number(aspectRatio.toFixed(3)),
        filledRatio: Number(filledRatio.toFixed(3)),
        holes,
      },
    });

    binaryMat.delete();
    // Burst per 5 to prevent overwhelming the system
    await new Promise<void>(r => setTimeout(r, fullCoverageSet.indexOf(staveNote) % 15 === 0 ? 800 : 100));
  }

  const output = `// @ts-generated\nexport default ${JSON.stringify(
    prototypes,
    null,
    2
  )};`;
  writeFileSync(outputPath, output, 'utf8');

  console.log(`✅ Generated ${prototypes.length} prototypes → ${outputPath}`);
  console.log(`🖼️  Debug PNGs saved in ${debugDir}`);
}
