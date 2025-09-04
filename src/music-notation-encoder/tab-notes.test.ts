import { describe, test } from "vitest";
import { default as VexTab } from 'vextab';
import { default as VexFlow, Flow } from 'vexflow';
import { JSDOM } from 'jsdom';

const Renderer = (VexFlow as any).Renderer as typeof Flow.Renderer;
const dom = new JSDOM('<document><body><canvas /></body></document>');
const canvas = dom.window.document.getElementsByTagName('canvas')[0];

describe('generate tabs', () => {

    test('all notes', () => {

        // Create VexFlow Renderer from canvas element with id #boo
        const renderer = new Flow.Renderer(canvas, Renderer.Backends.SVG);

        console.log(VexFlow.Flow.Artist);
        // Initialize VexTab artist and parser.
        // const artist = new Vex.Artist(10, 10, 600, { scale: 0.8 });
        // const tab = new VexTab.VexTab(artist);

        // try {
        //     tab.parse('tabstave')
        //     artist.render(renderer);
        // } catch (e) {
        //     console.error(e);
        // }
    })
})