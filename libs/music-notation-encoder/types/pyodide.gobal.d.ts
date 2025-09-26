
import type { LoadOptions, PyodideInterface } from '@pyodide/pyodide';

declare global {


  /** Global loader injected by the CDN script. */
  function loadPyodide(opts?: LoadOptions): Promise<PyodideInterface>;

  /** Optional global variable that holds the runtime after loading. */
  const pyodide: PyodideInterface | undefined;
}

/* Export something so the file is treated as a module. */
export {};