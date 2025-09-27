import { configDefaults, defineConfig } from 'vitest/config'

import config from './vite.config.mts'

export default defineConfig({
	...defineConfig(config as any),
	ssr: {
		noExternal: ["@techstark/opencv-js"],
	},
	optimizeDeps: {
		include: ["@techstark/opencv-js"],
	},
	test: {
		globals: true,
		environment: 'jsdom',
		testTimeout: 40_000,
		exclude: [...configDefaults.exclude, '**/node_modules/**'],
		setupFiles: ['./src/open-cv-bootstrap.mts'],

	}
})