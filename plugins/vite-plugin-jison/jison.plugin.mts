import { Plugin } from 'vite'
// @ts-expect-error
import jison from 'jison' // eslint-disable-line 7016

const pluginName = 'vite-plugin-jison';

export const jisonPlugin: Plugin = {
    name: pluginName,
    transform(code, id, _options) {
        if (!id.endsWith('.jison')) return null;

        const generator = new jison.Generator(code);
        const parserText = generator.generate();

        return { code: parserText }
    },
};