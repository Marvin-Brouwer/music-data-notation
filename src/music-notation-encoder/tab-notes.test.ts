import { describe, test } from "vitest";
import { VexTab as vt } from '../../git_modules/vextab/src/main';
import { default as VexFlow, Flow } from 'vexflow';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`
    <document>
        <body>
            <canvas />
        </body>
    </document>
`, {
    runScripts: "dangerously",
    pretendToBeVisual: true,
});
const canvas = dom.window.document.getElementsByTagName('canvas')[0];
// const Vex = VexFlow.Flow.Vex;

describe('generate tabs', () => {

    test('all notes', async () => {

        // Create VexFlow Renderer from canvas element with id #boo
        const renderer = new Flow.Renderer(canvas, Flow.Renderer.Backends.SVG);

        console.log(typeof vt);
        console.log(vt);
        console.log(Object.getOwnPropertyNames(vt));
        // Initialize VexTab artist and parser.
        const artist = new vt.Artist(10, 10, 600, { scale: 0.8 });
        const tab = new vt.VexTab(artist);

        try {
            tab.parse('tabstave')
            artist.render(renderer);
        } catch (e) {
            console.error(e);
        }
    })
})