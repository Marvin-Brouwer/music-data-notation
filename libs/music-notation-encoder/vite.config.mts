import { defineConfig } from 'vite';

export default defineConfig((c) => ({
    esbuild: {
        minifyIdentifiers: c.mode !== 'development',
        keepNames:  c.mode === 'development'
    },
    build: {
        target: 'esnext',
        sourcemap: 'inline',
        rollupOptions: {
            output: {
                esModule: true,
            },
            external: [
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
