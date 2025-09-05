import { describe, test } from "vitest";
// import { VexTab as vt } from '../../git_modules/vextab/src/main';
import { Stave, Renderer, BarlineType, StaveNote, Voice, Formatter, Beam, type FontInfo } from 'vexflow';
import fs from 'node:fs';

// document.head.appendChild(Object.assign(document.createElement('link'), {
//     href: 'https://fonts.googleapis.com/css2?family=Ballet:opsz@16..72&display=swap',
//     type: 'stylesheet'
// }))

const canvas = Object.assign(document.createElement('canvas'), {
    width: 1050,
    height: 400
})


describe('generate tabs', () => {

    test('all notes', async () => {


// // https://fonts.gstatic.com/s/ballet/v29/QGYvz_MYZA-HM4NJu0tqQ4E.woff2
// const font = await new FontFace('"Ballet", cursive', 'https://fonts.gstatic.com/s/ballet/v29/QGYvz_MYZA-HM4NJu0tqQ4E.woff2')
// .load();
// console.log(font)

        // Create VexFlow Renderer from canvas element with id #boo
        const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);

        renderer.resize(canvas.width, canvas.height);
        const context = renderer.getContext();
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.setFillStyle('white')
        context.setFont('sans-serif', 50)
        context.fillText('Scan the notes below', 50, 110)
        context.save();
        context.scale(2, 2)
        context.fillStyle = 'white';
        context.fillRect(20, 90, 485, 90)
        context.fillStyle = 'black';

        // Create a stave of width 400 at position 10, 40.
        const stave1 = new Stave(40, 75, 200, {

        });
        const stave2 = new Stave(240, 75, 240, {

        });
        // Add a clef and time signature.
        stave1
            .addClef('treble')
            .addTimeSignature('4/4');

        stave2
            .setEndBarType(BarlineType.END)
        // .addTrebleGlyph();

        // Connect it to the rendering context and draw!
        stave1.setContext(context).draw();
        stave2.setContext(context).draw();

        const fakeErrorNotes = [
            new StaveNote({ keys: ["c/4"], duration: "8" }),
            new StaveNote({ keys: ["c/4"], duration: "8" }),
            new StaveNote({ keys: ["c/4"], duration: "8" }),
            new StaveNote({ keys: ["c/4"], duration: "8" }),
        ]
        Formatter.FormatAndDraw(context, stave1, fakeErrorNotes)
        // Create the notes
        const notes = [
            // A quarter-note C.
            new StaveNote({ keys: ["c/4"], duration: "q" }),
            new StaveNote({ keys: ["c/4"], duration: "q" }),

            // A quarter-note D.
            new StaveNote({ keys: ["d/4"], duration: "q" }),

            // A quarter-note rest. Note that the key (b/4) specifies the vertical
            // position of the rest.
            new StaveNote({ keys: ["b/4"], duration: "qr" }),

            // A C-Major chord.
            new StaveNote({ keys: ["c/4", "e/4", "g/4"], duration: "q" }),

            // A C-Major chord.
            new StaveNote({ keys: ["c/4", "e/4", "g/4"], duration: "q" }),
            new StaveNote({ keys: ["b/4"], duration: "qr" }),
            new StaveNote({ keys: ["b/4"], duration: "qr" }),
        ];


        // Format and justify the notes to 400 pixels.
        Formatter.FormatAndDraw(context, stave2, notes)

        const imageBytes = canvas.toDataURL()
        fs.writeFileSync(__dirname + '/tab-notes.test.example.png', imageBytes.substring(imageBytes.indexOf(',') + 1), { encoding: 'base64' })
    })
})