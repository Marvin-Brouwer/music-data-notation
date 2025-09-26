import { configDefaults, defineConfig } from 'vitest/config'

import config from './vite.config.mts'

export default defineConfig({
	...defineConfig(config as any),
	test: {
		globals: true,
		environment: 'jsdom',
		testTimeout: 40_000,
    	exclude: [...configDefaults.exclude, '**/node_modules/**'],
		server: {
			deps: {
				fallbackCJS: true,
				inline: [
					"vextab"
				]
			}
		}
	}
})