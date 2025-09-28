import { defineConfig } from 'vite';

export default defineConfig({
    // This is a devtool, don't minify
    esbuild: {
        minifyIdentifiers: false,
        keepNames: true
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
});
