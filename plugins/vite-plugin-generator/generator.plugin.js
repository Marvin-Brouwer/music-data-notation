/**
 * Vite plugin that:
 *   Runs scripts on buildStart
 */
export default function runGenerators(
  /** Generators to run */
  ...generators
) {

  // -----------------------------------------------------------------
  // Vite plugin definition
  // -----------------------------------------------------------------
  return {
    name: "vite-plugin-generator",
    // -------------------------------------------------------------
    // Before bundling starts – build the custom WASM that contains
    // all collected Python files.
    // -------------------------------------------------------------
    async buildStart() {
      for(let generator of generators) await generator();
    },
    async configureVitest() {
      for(let generator of generators) await generator();
    }
  }
}