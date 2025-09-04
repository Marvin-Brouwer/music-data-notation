import { describe, test } from "vitest";
// import { VexTab as vt } from '../../git_modules/vextab/src/main';
import { Stave, Renderer } from 'vexflow';
import fs from 'node:fs';

const canvas = Object.assign(document.createElement('canvas'), {
    width: 500,
    height: 500
})
// const Vex = VexFlow.Flow.Vex;

describe('generate tabs', () => {

    test('all notes', async () => {

        // Create VexFlow Renderer from canvas element with id #boo
        const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);

        renderer.resize(canvas.width, canvas.height);
        const context = renderer.getContext();

        // Create a stave of width 400 at position 10, 40.
        const stave = new Stave(10, 40, 400);

        // Add a clef and time signature.
        stave.addClef('treble').addTimeSignature('4/4');

        // Connect it to the rendering context and draw!
        stave.setContext(context).draw();

        const imageBytes = canvas.toDataURL()
       fs.writeFileSync(__dirname+'/tab-notes.test.example.png', imageBytes.substring(imageBytes.indexOf(',')+1), {encoding: 'base64'})
    })
})