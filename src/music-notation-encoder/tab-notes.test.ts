import { describe, test } from "vitest";
import { VexTab, Artist } from 'vextab';
import { default as VexFlow, Flow } from 'vexflow';
import { Canvas } from 'skia-canvas'

describe('generate tabs', () => {

    test('all notes', () => {

        const Renderer = (VexFlow as any).Renderer as typeof Flow.Renderer;
        const canvas = new Canvas(200, 200);

        // Create VexFlow Renderer from canvas element with id #boo
        const renderer = new Renderer(canvas as unknown as HTMLElement, Renderer.Backends.SVG);

        // Initialize VexTab artist and parser.
        const artist = new Artist(10, 10, 600, { scale: 0.8 });
        const tab = new VexTab(artist);

        try {
            tab.parse('tabstave')
            artist.render(renderer);
        } catch (e) {
            console.error(e);
        }
    })
})