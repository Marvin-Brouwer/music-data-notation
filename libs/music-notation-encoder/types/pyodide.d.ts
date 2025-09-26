/*=====================================================================
  src/types/pyodide.d.ts
  Ambient module declaration for the "@pyodide/pyodide" package.
  This matches the public API of the CDN build (full/pyodide.js) and
  provides full type‑information for TypeScript projects.
=====================================================================*/

declare module "@pyodide/pyodide" {
  /** Options you can pass to `loadPyodide()`. */
  export interface LoadOptions {
    /** Base URL for the Pyodide distribution (defaults to the CDN path). */
    indexURL?: string;
    /** Packages to preload after the core runtime. */
    packages?: string[];
    /** Optional callbacks for progress / logging (useful for a loader UI). */
    stdout?: (msg: string) => void;
    /** Optional callbacks for error logging. */
    stderr?: (msg: string) => void;
  }

  /** The main Pyodide runtime object returned by `loadPyodide()`. */
  export interface PyodideInterface {
    /** Load additional wheels / packages (e.g. ["numpy","opencv-python-headless"]). */
    loadPackage(packages: string[] | string): Promise<void>;

    /** Execute Python code synchronously and return the result as a JavaScript value. */
    runPython<T = any>(code: string): T;

    /** Execute Python code asynchronously (awaitable) and return the result as a JavaScript value. */
    runPythonAsync<T = any>(code: string): Promise<T>;

    /** Convert a JavaScript value to a Python proxy that lives inside the VM. */
    toPy(value: any): any; // opaque proxy – `any` is the safest representation

    /** Convert a Python proxy back to a native JavaScript value. */
    toJs<T = any>(pyObj: any): T;

    /** The virtual filesystem (Emscripten‑style) exposed by Pyodide. */
    FS: {
      /** Write a file (binary or UTF‑8 string) into the in‑memory FS. */
      writeFile(path: string, data: Uint8Array | string): void;
      /** Read a file from the FS (returns Uint8Array or string depending on opts). */
      readFile(
        path: string,
        opts?: { encoding?: "binary" | "utf8" }
      ): Uint8Array | string;
      /** Delete a file or directory. */
      unlink(path: string): void;
      /** Create a directory tree recursively. */
      mkdirTree(path: string): void;
      /** List entries in a directory. */
      readdir(path: string): string[];
      /** Test whether a path exists. */
      exists(path: string): boolean;
      /** Change the current working directory. */
      chdir(path: string): void;
      /** Get the current working directory. */
      cwd(): string;
    };

    /** Access to the global Python namespace (a dict‑like object). */
    globals: {
      /** Retrieve a Python object by name (e.g. `pyodide.globals.get("np")`). */
      get(name: string): any;
      /** Assign a variable in the Python globals. */
      set(name: string, value: any): void;
      /** Delete a variable from globals. */
      delete(name: string): void;
    };

    /** Direct access to the underlying Emscripten heap – useful for advanced interop. */
    HEAPU8: Uint8Array;
    HEAPU16: Uint16Array;
    HEAPU32: Uint32Array;
    HEAPF32: Float32Array;
    HEAPF64: Float64Array;

    /** Allocate memory inside the Pyodide heap (returns a pointer). */
    _malloc(size: number): number;
    /** Free memory previously allocated with `_malloc`. */
    _free(ptr: number): void;

    /** Register a JavaScript module so it can be imported from Python code. */
    registerJsModule(name: string, module: Record<string, any>): void;
  }

  /**
   * Load the Pyodide runtime.
   *
   * The function is injected by the CDN script (`full/pyodide.js`) but this
   * declaration makes it usable as a proper ES‑module import.
   *
   * @param opts Optional configuration (indexURL, packages, stdout/stderr callbacks)
   * @returns A promise that resolves to a fully‑typed `PyodideInterface`.
   */
  export function loadPyodide(opts?: LoadOptions): Promise<PyodideInterface>;

  /** Optional convenience: expose the global `pyodide` variable if the consumer
   *  accesses it directly (e.g. `window.pyodide`). */
  export const pyodide: PyodideInterface | undefined;
}

/* src/types/pyodide.d.ts -------------------------------------------------- */
/* Global type declarations for the Pyodide CDN script                     */
