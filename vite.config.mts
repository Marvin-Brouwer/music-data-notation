import { defineConfig } from 'vite';

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
    ],
    build: {
        target: 'esnext',
    },
    optimizeDeps: {
        exclude: ['js-sha256'],
    }
});
