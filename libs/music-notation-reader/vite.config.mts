import { defineConfig } from 'vite';

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
