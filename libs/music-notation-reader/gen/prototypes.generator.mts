/**
 * src/utils/generate-prototypes.mts
 *
 * Exported async function:
 *   generatePrototypes({ outDir }: { outDir: string }): Promise<void>
 *
 * What it does:
 *   1️⃣  Loads the Bravura music font that VexFlow ships as a
 *       Base‑64 string (via `vexflow/build/esm/src/fonts/bravura.js`).
 *   2️⃣  Registers that font with node‑canvas (writes a temporary .otf file).
 *   3️⃣  Uses VexFlow’s exported `Glyphs` map (no HTTP download) to obtain
 *       every glyph name → Unicode code‑point.
 *   4️⃣  For each glyph:
 *        • Renders it on a hidden canvas.
 *        • Saves a PNG for visual debugging (`writeImage`).
 *        • Runs your existing `preprocess` → `extractFeatures` pipeline.
 *        • Stores the three geometric descriptors together with the
 *          glyph’s *human‑readable name* (the key from `Glyphs`).
 *   5️⃣  Writes a `prototypes.json` file (array of `{ label, features }`)
 *       into the folder you supplied.
 *
 * The function can be imported and awaited from any other module, e.g.:
 *
 *   import { generatePrototypes } from './utils/generate-prototypes.mts';
 *   await generatePrototypes({ outDir: './src/generated' });
 *
 * ----------------------------------------------------------------------
 * IMPORTANT: this file assumes you are using **node‑canvas** (the npm
 * package named `canvas`) and **jsdom** for the minimal DOM that
 * VexFlow requires.
 * ----------------------------------------------------------------------
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { JSDOM } from 'jsdom';
import VF from 'vexflow';
import { preprocess } from '../src/preprocess.mjs';
import { extractFeatures } from '../src/feature-extractor.mjs';
import { loadFont, patchCanvas, writeImage } from '@marvin-brouwer/tools';

import "../types/vexflow-glyphs.d.mts"
import { readdir, rm } from 'fs/promises';
// @ts-expect-error
const {Glyphs} = await import('../node_modules/vexflow/build/esm/src/glyphs') as
 typeof import('vexflow/build/esm/src/glyphs');



(globalThis as any).LOG_IMAGES = false;

// ------------------------------------------------------------------
// 1️⃣  Constants & helpers
// ------------------------------------------------------------------
const CANVAS_W = 200;
const CANVAS_H = 200;
const FONT_SCALE = 1.5;               // same scale you used when loading the font
const BASE_FONT_SIZE = 40;            // base size for the VexFlow font

/** Ensure a directory exists (recursive). */
function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// ------------------------------------------------------------------
// 2️⃣  Minimal DOM shim – VexFlow expects `window` / `document`
// ------------------------------------------------------------------
const html = `<!DOCTYPE html><html><body></body></html>`;
const dom = new JSDOM(html, { resources: 'usable', runScripts: 'dangerously', includeNodeLocations: true });
(global as any).window = dom.window;
global.document = dom.window.document;

patchCanvas();
await loadFont(import.meta.resolve('vexflow-fonts/package.json'), './bravura/Bravura_1.392.woff2')

// ------------------------------------------------------------------
// 3️⃣  Canvas setup (shared across all glyphs)
// ------------------------------------------------------------------
const canvas = Object.assign(document.createElement('canvas'), {
  width: CANVAS_W,
  height: CANVAS_H
});
const ctx = canvas.getContext('2d')!;


// const fontBravura = await Font.load('Bravura', Bravura, { display: 'block' });

// ------------------------------------------------------------------
// 2️⃣  Render a single glyph, write a PNG, and return its ImageData
// ------------------------------------------------------------------
/**
 * Render a glyph identified by its *human‑readable* name (the key from
 * VexFlow’s `Glyphs` map), write a PNG for visual debugging, and
 * return the raw ImageData.
 *
 * @param glyphName – the key from Glyphs (e.g. "v4e").
 * @param debugDir  – folder where the PNG will be saved.
 * @returns ImageData of the rendered glyph.
 */
async function renderGlyph(glyphName: string, debugDir: string): Promise<ImageData> {
  // --------------------------------------------------------------
  // 0️⃣  Ensure the Bravura font is registered (once per process)
  // --------------------------------------------------------------


  // --------------------------------------------------------------
  // 1️⃣  Look up the Unicode code‑point for the requested glyph.
  // --------------------------------------------------------------
  // `VF.Glyphs` is exported by VexFlow and maps the human‑readable name
  // to an object that contains `code_point` (hex string, e.g. "E0A2").
  const unicodeChar = Glyphs[glyphName as keyof typeof Glyphs];

  // Convert hex → actual Unicode character.
  console.log(glyphName, unicodeChar)

  // --------------------------------------------------------------
  // 3️⃣  Clear the canvas (transparent background)
  // --------------------------------------------------------------
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // --------------------------------------------------------------
  // 4️⃣  Configure the canvas context to use the Bravura music font.
  // --------------------------------------------------------------
  ctx.font = ` ${BASE_FONT_SIZE * FONT_SCALE}px Bravura`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#000'; // black glyph

  // --------------------------------------------------------------
  // 5️⃣  Measure the glyph so we can centre it.
  // --------------------------------------------------------------
  const metrics = ctx.measureText(unicodeChar);
  const glyphWidth =
    (metrics.actualBoundingBoxLeft ?? 0) +
    (metrics.actualBoundingBoxRight ?? metrics.width);
  const glyphHeight =
    (metrics.actualBoundingBoxAscent ?? 0) +
    (metrics.actualBoundingBoxDescent ?? 0);

  const x = (CANVAS_W - glyphWidth) / 2 - (metrics.actualBoundingBoxLeft ?? 0);
  const y =
    CANVAS_H / 2 +
    ((metrics.actualBoundingBoxAscent ?? metrics.emHeightAscent ?? 0) -
      glyphHeight / 2);

  // --------------------------------------------------------------
  // 6️⃣  Render the character onto the canvas.
  // --------------------------------------------------------------
  ctx.fillText(unicodeChar, x, y);

  // --------------------------------------------------------------
  // 7️⃣  Capture the raw pixel data.
  // --------------------------------------------------------------
  const imgData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H) as ImageData;

  // --------------------------------------------------------------
  // 8️⃣  Write a PNG for visual debugging (using @marvin-brouwer/tools)
  // --------------------------------------------------------------
  const pngPath = join(debugDir, `${glyphName}.png`);
  writeImage(pngPath, imgData); // writes the PNG file

  return imgData;
}

// ------------------------------------------------------------------
// 6️⃣  Core generator – async because we await the font load (which is
//     effectively synchronous after we write the temp file)
// ------------------------------------------------------------------

/**
 * Generate `prototypes.json` and PNG debug images for **every glyph**
 * that VexFlow knows about (according to the exported `Glyphs` map).
 * The function uses the exact same preprocessing / feature‑extraction
 * pipeline you already have, so the numbers line up perfectly with your
 * classifier.
 *
 * @param opts.outDir – absolute or relative path where the output will be written.
 */
export async function generatePrototypes(): Promise<void> {
  const outRoot = resolve(__dirname);
  const fontDir = join(outRoot, 'fonts');
  const debugDir = join(outRoot, 'debug');
  const outputPath = join(outRoot, '../src/prototypes.g.ts');

  // Ensure output folders exist.
  ensureDir(outRoot);
  ensureDir(fontDir);
  ensureDir(debugDir);

  const debugFiles = (await readdir(debugDir))
    .filter(file => file !== '.gitignore')
  for (const fileName of debugFiles)
    await rm(debugDir+ '/' + fileName)

  // ----------------------------------------------------------------
  // 6.2  Get the list of glyph names from VexFlow's Glyphs map.
  // ----------------------------------------------------------------
  const glyphNames = Object.keys(Glyphs)
    .filter(name => name !== 'null')
    .filter(name => !name.toLowerCase().includes('tab'))
    .filter(name => !name.toLowerCase().includes('comb'))
    .filter(name => !name.toLowerCase().includes('ranks'))
    .filter(name => !name.toLowerCase().includes('arrow'))
    .filter(name => !name.toLowerCase().includes('unused'))

  // ----------------------------------------------------------------
  // 6.3  Iterate over every glyph name.
  // ----------------------------------------------------------------
  interface Prototype {
    label: string;
    features: {
      aspectRatio: number;
      filledRatio: number;
      holes: number;
    };
  }

  const prototypes: Prototype[] = [];

  for (const glyphName of glyphNames) {
    // Render the glyph → ImageData (PNG already written inside renderGlyph)
    const imgData = await renderGlyph(glyphName, debugDir);

    // Run the exact same preprocessing you use at runtime.
    const binaryMat = preprocess(imgData);

    // Extract the three geometric descriptors.
    const { aspectRatio, filledRatio, holes } = extractFeatures(binaryMat, {
      x: 0,
      y: 0,
      width: binaryMat.cols,
      height: binaryMat.rows,
    });

    // Store the prototype (rounded to three decimals for readability).
    prototypes.push({
      label: glyphName,
      features: {
        aspectRatio: Number(aspectRatio.toFixed(3)),
        filledRatio: Number(filledRatio.toFixed(3)),
        holes,
      },
    });

    // Clean up the temporary OpenCV matrix.
    binaryMat.delete();
  }

  // ----------------------------------------------------------------
  // 6.4  Write the JSON file.
  // ----------------------------------------------------------------
  const output = `// @ts-generated\nexport default ${JSON.stringify(prototypes, null, 2)};`;
  writeFileSync(outputPath, output, 'utf8');

  console.log(`✅ Generated ${prototypes.length} prototypes → ${outputPath}`);
  console.log(`🖼️  Debug PNGs saved in ${debugDir}`);
}