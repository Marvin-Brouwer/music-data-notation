import { defineConfig } from 'vite';

import commonjs from 'vite-plugin-commonjs'

export default defineConfig({
    plugins: [

        // // We need buffer to do cryptographic stuff
        // nodePolyfills({
        //     include: ['buffer'],
        //     globals: {
        //         Buffer: true
        //     },
        //     protocolImports: true,
        // }),
        commonjs(),
    ],
    build: {
        target: 'esnext'
    },
    optimizeDeps: {
        exclude: ['js-sha256', "pyodide"],
    }
});
