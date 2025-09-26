// src/omr.ts
/**
 * OMR (Optical‑Music‑Recognition) helper that runs inside Pyodide.
 *
 * This version **imports** `loadPyodide` from the official npm package
 * (`pyodide/dist/pyodide.mjs`).  The package ships the required
 * WebAssembly binary alongside the JS module, so no network request is needed
 * at runtime – the loader reads the local `.wasm` file.
 *
 * The public API consists of:
 *   • `getPyodide()` – returns a cached, fully‑initialised Pyodide instance.
 *   • `imageDataToMusicXML(img)` – converts an `ImageData` (RGBA) to a MusicXML
 *     string using the Python OMR engine (`omrmarkengine.py`).
 *
 * The code works both in the browser (via Vite) and under Vitest (Node).
 */

import type { PyodideInterface } from "pyodide";
// The npm package re‑exports the loader as a named export.
import { loadPyodide } from "pyodide";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* ----------------------------------------------------------------------
   1️⃣  Module‑level caches – initialise only once per process / test run.
   ---------------------------------------------------------------------- */
let pyodidePromise: Promise<PyodideInterface> | null = null;


/**
 * Returns the absolute path that points to the folder that contains
 *   - pyodide.wasm
 *   - python_stdlib.zip
 *   - repodata.json
 *
 * The folder lives next to the JS module we just imported.
 */
function getPyodideRoot(): string {
  // `import.meta.url` is the URL of the current file (this .ts file after compilation).
  // We resolve it to a file system path, then walk up to the `dist` folder.
  const thisFile = fileURLToPath(import.meta.url);
  // Example: .../src/omr.ts  →  .../node_modules/pyodide/dist
  const distFolder = resolve(thisFile, "../../../../node_modules/pyodide");
  return distFolder;
}

/**
 * Initialise Pyodide, install the wheels we need, and load the OMR Python engine.
 *
 * The function is **idempotent** – subsequent calls return the same cached
 * interpreter, which is important for performance in a UI or during tests.
 */
export async function getPyodide(): Promise<PyodideInterface> {
  if (pyodidePromise) {
    return pyodidePromise;
  }

  pyodidePromise = (async () => {
    /* --------------------------------------------------------------
       2️⃣  Load Pyodide from the locally‑installed package.
       -------------------------------------------------------------- */
    const loadOpts: Parameters<typeof loadPyodide>[0] = {
      indexURL: getPyodideRoot(),
      // Wheels required by the OMR engine.
      packages: ["numpy", "opencv-python", "pillow"],
    };

    const py = await loadPyodide(loadOpts);

    /* --------------------------------------------------------------
       3️⃣  Fetch the Python source that implements the OMR engine.
       -------------------------------------------------------------- */
       // Todo git submodule
    const response = await fetch("/omrmarkengine.py");
    if (!response.ok) {
      throw new Error(
        `Failed to fetch omrmarkengine.py – HTTP ${response.status}`
      );
    }
    const source = await response.text();

    /* --------------------------------------------------------------
       4️⃣  Write the source into Pyodide’s virtual filesystem.
       -------------------------------------------------------------- */
    py.FS.writeFile("/omr.py", source);

    /* --------------------------------------------------------------
       5️⃣  Dynamically import the module inside the interpreter.
       -------------------------------------------------------------- */
    await py.runPythonAsync(`
      import importlib.util, sys
      spec = importlib.util.spec_from_file_location("omr", "/omr.py")
      omr = importlib.util.module_from_spec(spec)
      sys.modules["omr"] = omr
      spec.loader.exec_module(omr)
    `);

    return py;
  })();

  return pyodidePromise;
}

/**
 * Convert an `ImageData` (RGBA) to MusicXML using the OMR engine’s
 * `process_image` function.
 *
 * @param img – An `ImageData` object (e.g. obtained from a Canvas or OffscreenCanvas).
 * @returns The raw MusicXML string produced by the Python engine.
 */
export async function imageDataToMusicXML(
  img: ImageData
): Promise<string> {
  const py = await getPyodide();

  /* --------------------------------------------------------------
     6️⃣  Transfer the Uint8ClampedArray (the raw RGBA buffer) into
         the Pyodide runtime.  `py.toPy` creates a proxy that Python can
         treat as a buffer/bytes object.
     -------------------------------------------------------------- */
  const pyBuf = py.toPy(img.data);

  /* --------------------------------------------------------------
     7️⃣  Run a short Python snippet that:
         • Recreates the RGBA array as a NumPy ndarray.
         • Reshapes it to (height, width, 4).
         • Converts it to a single‑channel grayscale image (most OMR pipelines expect that).
         • Calls `omr.process_image`, which returns MusicXML.
     -------------------------------------------------------------- */
  const xml = await py.runPythonAsync(`
    import numpy as np, omr
    # Re‑create the flat RGBA buffer → (H, W, 4)
    arr = np.frombuffer(${pyBuf}.tobytes(), dtype=np.uint8)
    arr = arr.reshape((${img.height}, ${img.width}, 4))

    # Convert to grayscale using the standard luminance coefficients
    gray = np.dot(arr[..., :3], [0.2989, 0.5870, 0.1140]).astype(np.uint8)

    # Public API of the repo – returns MusicXML
    omr.process_image(gray)
  `);

  // Clean up the proxy to avoid leaking WASM memory.
  (pyBuf as any).destroy?.();

  return xml;
}