import { defineConfig } from 'vite';

import commonjs from 'vite-plugin-commonjs'
// @ts-expect-error
import coffee from "vite-plugin-coffee";
import { jisonPlugin } from './plugins/jison.plugin.mts';

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
        coffee({
            jsx: true
        }),
         jisonPlugin,
    ],
    build: {
        target: 'esnext'
    },
    optimizeDeps: {
        exclude: ['js-sha256'],
    }
});
