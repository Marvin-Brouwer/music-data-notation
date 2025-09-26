// vite-plugin-micropython-embed.ts
import { Plugin } from "vite";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { resolve, extname, basename } from "node:path";
import { spawn } from "node:child_process";

/**
 * Vite plugin that:
 *   1️⃣  Finds every import that ends with `.py` and stores its source.
 *   2️⃣  At `buildStart` runs `python-wasm-cli embed` to produce a **custom**
 *       MicroPython WASM binary (`custom.wasm`) that already contains all
 *       collected Python files in its virtual filesystem.
 *   3️⃣  Emits a **virtual runtime module** (`\0micropython-runtime`) that
 *       re‑exports a singleton `pythonRuntime` (see src/pythonRuntime.ts).
 *   4️⃣  Emits a **virtual `.py` module** for each imported file that
 *       re‑exports an async `runPython(overrideSource?)` function which
 *       forwards the source (or an override) to the shared interpreter.
 *
 * **No HTTP requests** are made at runtime – the Python code is baked
 * into the generated `custom.wasm` asset.
 */
export default function micropythonEmbedPlugin(options?: {
  /** Where the generated WASM + JS loader will be written (relative to project root). */
  outDir?: string;
  /** Optional filter – only embed files for which this returns true. */
  include?: (absPath: string) => boolean;
}): Plugin {
  // -----------------------------------------------------------------
  // Configuration & internal state
  // -----------------------------------------------------------------
  const outDir = resolve(process.cwd(), options?.outDir ?? "build/embed");
  const include = options?.include ?? (() => true);

  // Map absolute path → source code (collected during resolveId)
  const pySources = new Map<string, string>();

  // Virtual ID for the shared runtime (singleton)
  const VIRTUAL_RUNTIME_ID = "\0micropython-runtime";

  // -----------------------------------------------------------------
  // Helper: run the `python-wasm-cli embed` command to create a custom WASM
  // -----------------------------------------------------------------
  async function buildCustomWasm(): Promise<void> {
    // Clean the output folder first
    await rm(outDir, { recursive: true, force: true });
    await mkdir(outDir, { recursive: true });

    // Build a manifest that the CLI understands:
    // [{ "path": "/foo.py", "source": "print('hi')" }, …]
    const manifest = Array.from(pySources.entries()).map(([absPath, src]) => ({
      path: "/" + basename(absPath), // mount at root of the virtual FS
      source: src,
    }));
    const manifestPath = resolve(outDir, "embed-manifest.json");
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

    // Run the CLI:
    //   npx python-wasm-cli embed --manifest <manifest> --out-dir <outDir> --out-name custom
    await new Promise<void>((resolvePromise, reject) => {
      const cmd = "npx";
      const args = [
        "python-wasm-cli",
        "embed",
        "--manifest",
        manifestPath,
        "--out-dir",
        outDir,
        "--out-name",
        "custom", // produces custom.wasm + custom.js
      ];
      const child = spawn(cmd, args, { stdio: "inherit", shell: true });
      child.on("close", (code) => {
        if (code === 0) resolvePromise();
        else reject(new Error(`python-wasm-cli exited with code ${code}`));
      });
    });
  }

  // -----------------------------------------------------------------
  // Vite plugin definition
  // -----------------------------------------------------------------
  return {
    name: "vite-plugin-micropython-embed",

    // -------------------------------------------------------------
    // Resolve IDs
    // -------------------------------------------------------------
    async resolveId(source, importer) {
      // 1️⃣  Handle the virtual runtime module
      if (source === VIRTUAL_RUNTIME_ID) return source;

      // 2️⃣  Handle imports that end with .py
      if (!importer) return null;
      if (extname(source) !== ".py") return null;

      const resolved = await this.resolve(source, importer, { skipSelf: true });
      if (!resolved) return null;

      const absPath = resolve(resolved.id);
      if (include(absPath) && !pySources.has(absPath)) {
        const src = await readFile(absPath, "utf8");
        pySources.set(absPath, src);
      }

      // Append a custom query so Vite treats it as a virtual module
      return resolved.id + "?micropython-virtual";
    },

    // -------------------------------------------------------------
    // Load modules
    // -------------------------------------------------------------
    async load(id) {
      // 1️⃣  Load the virtual runtime module (shared singleton)
      if (id === VIRTUAL_RUNTIME_ID) {
        // The runtime wrapper lives at src/pythonRuntime.ts
        const runtimePath = "./src/pythonRuntime";
        return `export { pythonRuntime } from "${runtimePath}";`;
      }

      // 2️⃣  Load a virtual .py module
      if (id.endsWith("?micropython-virtual")) {
        const pyPath = id.replace("?micropython-virtual", "");
        const source = pySources.get(pyPath);
        if (source === undefined) {
          this.error(`Unable to locate source for ${pyPath}`);
        }

        // The virtual module imports the shared runtime and forwards the source.
        return `
          import { pythonRuntime } from "${VIRTUAL_RUNTIME_ID}";
          const __originalSource = ${JSON.stringify(source)};
          export async function runPython(overrideSource) {
            const src = overrideSource ?? __originalSource;
            return pythonRuntime.runPython(src);
          }
        `;
      }

      // Anything else – let Vite handle it.
      return null;
    },

    // -------------------------------------------------------------
    // Before bundling starts – build the custom WASM that contains
    // all collected Python files.
    // -------------------------------------------------------------
    async buildStart() {
      if (pySources.size === 0) {
        // No .py files were imported – nothing to embed.
        return;
      }
      this.warn(`[micropython-embed] Embedding ${pySources.size} Python file(s) into custom.wasm`);
      await buildCustomWasm();
    },

    // -------------------------------------------------------------
    // Emit the generated assets (custom.wasm + custom.js) so Vite copies
    // them to the output directory.
    // -------------------------------------------------------------
    async generateBundle(_, bundle) {
      const wasmPath = resolve(outDir, "custom.wasm");
      const jsPath = resolve(outDir, "custom.js");

      const [wasmData, jsData] = await Promise.all([
        readFile(wasmPath),
        readFile(jsPath, "utf8"),
      ]);

      // Emit the WASM binary
      bundle["custom.wasm"] = {
        type: "asset",
        fileName: "custom.wasm",
        name: undefined,
        names: ["custom.wasm"],
        originalFileName: null,
        originalFileNames: ["custom.wasm"],
        source: wasmData,
        needsCodeReference: false
      };

      // Emit the JS loader (Emscripten glue)
      bundle["custom.js"] = {
        type: "asset",
        fileName: "custom.js",
        name: undefined,
        names: ["custom.js"],
        originalFileName: null,
        originalFileNames: ["custom.js"],
        source: jsData,
        needsCodeReference: false
      };
    },

    // -------------------------------------------------------------
    // Ensure .wasm files are treated as assets (important for the dev server)
    // -------------------------------------------------------------
    config(config) {
      const wasmPattern = /\.wasm$/i;
      if (!Array.isArray(config.assetsInclude)) {
        if (!config.assetsInclude) config.assetsInclude = [];
        else config.assetsInclude = [config.assetsInclude]
      }
      if (!config.assetsInclude?.some((p) => p instanceof RegExp && p.source === wasmPattern.source)) {
        config.assetsInclude?.push(wasmPattern);
      }
    },

    // -------------------------------------------------------------
    // Cleanup temporary folder after a production build (keep it for watch mode)
    // -------------------------------------------------------------
    async closeBundle() {
      if (process.env.NODE_ENV === "development") return;
      await rm(outDir, { recursive: true, force: true });
    },
  };
}