import { configDefaults, defineConfig } from 'vitest/config'

import config from './vite.config.mts'

export default defineConfig({
	...defineConfig(config as any),
	test: {
		environment: 'node',
    	exclude: [...configDefaults.exclude, '**/node_modules/**']
	}
})