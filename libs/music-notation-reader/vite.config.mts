import { defineConfig } from 'vite';
import { generatePrototypes } from './gen/prototypes.generator.mts' 

await generatePrototypes({
    outputFile: '../src/prototypes.g.ts',
    // Don't overwrite in gh actions
    overwrite: !process.env["GITHUB_ACTIONS"],
    // Don't need debug images in gh actions
    writeDebugOutput: !process.env["GITHUB_ACTIONS"]
});

export default defineConfig((c) => ({
    esbuild: {
        minifyIdentifiers: c.mode !== 'development',
        keepNames: c.mode === 'development'
    },
    optimizeDeps: {
        esbuildOptions: {
            target: 'esnext'
        }
    },
    build: {
        target: 'esnext',
        sourcemap: 'inline',
        rollupOptions: {
            output: {
                esModule: true,
            },
            external: [
                // '@techstark/opencv-js',
                /^node:/,
                /^virtual:/,
            ]
        },
        lib: {
            formats: ['es'],
            entry: './src/_module.mts'
        }
    }
}));
