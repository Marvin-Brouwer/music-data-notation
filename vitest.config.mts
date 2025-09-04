import { defineConfig } from 'vitest/config'

import config from './vite.config.mts'

export default defineConfig({
	...defineConfig(config as any),
	test: {
		globals: true,
		environment: 'jsdom',
		testTimeout: 40_000,
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