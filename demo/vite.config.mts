import { gitHubSpaConfig } from "@quick-vite/gh-pages-spa/config";
import solid from 'vite-plugin-solid'
import basicSsl from '@vitejs/plugin-basic-ssl'

import packageJson from './package.json' assert { type: 'json' }

export default gitHubSpaConfig(packageJson, c => ({
    plugins: [
        // Add basic ssl, so, the camera can be used in local network.
        ...(c.mode === 'development' && c.command === "serve" ? [basicSsl()] : []),
        solid() as any
    ],
    optimizeDeps: {
        esbuildOptions: {
            target: 'esnext'
        }
    },
    build: {
        target: 'esnext',
        sourcemap: true
    }
}))