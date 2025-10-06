import { defineConfig } from 'vite';
import commonJs from 'vite-plugin-commonjs';

export default defineConfig({
    plugins: [
        commonJs()
    ],
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
                '@napi-rs/canvas'
            ]
        },
        lib: {
            formats: ['es'],
            entry: './src/_module.mts'
        }
    }
});
