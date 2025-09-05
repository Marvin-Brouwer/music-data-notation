import { describe, test } from "vitest";
// import { VexTab as vt } from '../../git_modules/vextab/src/main';
import { Stave, Renderer, BarlineType, StaveNote, Voice, Formatter, Beam, type FontInfo } from 'vexflow';
import fs from 'node:fs';

const CLEF_STAVE_WIDTH = 70;
const STAVE_MARGIN = 10;
const STAVE_PADDING = 10;
const NOTE_WIDTH = 30;

const canvas = Object.assign(document.createElement('canvas'), {
    width: calculateWidth(16),
    height: 120
})

const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
renderer.resize(canvas.width, canvas.height);
const cvContext = renderer.getContext();
cvContext.fillStyle = 'white';
cvContext.fillRect(0, 0, canvas.width, canvas.height)
cvContext.save();

describe('generate tabs', () => {

    test('all notes', async () => {

        const linePosition = 4;
        const notes = [
            new StaveNote({ keys: ["c/4"], duration: "8" }),
            new StaveNote({ keys: ["c/4"], duration: "8" }),
            new StaveNote({ keys: ["c/4"], duration: "8" }),
            new StaveNote({ keys: ["c/4"], duration: "8" }),

            new StaveNote({ keys: ["c/4"], duration: "q" }),
            new StaveNote({ keys: ["c/4"], duration: "q" }),
            new StaveNote({ keys: ["d/4"], duration: "q" }),
            new StaveNote({ keys: ["b/4"], duration: "qr" }),
            new StaveNote({ keys: ["c/4", "e/4", "g/4"], duration: "q" }),
            new StaveNote({ keys: ["c/4", "e/4", "g/4"], duration: "q" }),
            new StaveNote({ keys: ["b/4"], duration: "qr" }),
            new StaveNote({ keys: ["b/4"], duration: "qr" }),
            new StaveNote({ keys: ["c/4"], duration: "q" }),
            new StaveNote({ keys: ["c/4"], duration: "q" }),
            new StaveNote({ keys: ["d/4"], duration: "q" }),
            new StaveNote({ keys: ["b/4"], duration: "qr" }),
        ]
        const imageBytes = generateExample(linePosition, notes);


        fs.writeFileSync(__dirname + '/tab-notes.test.example.png', imageBytes.substring(imageBytes.indexOf(',') + 1), { encoding: 'base64' })
    })
})

function calculateWidth(notesLength: number) {

    const noteWidth = NOTE_WIDTH * notesLength + STAVE_PADDING

    return STAVE_MARGIN + CLEF_STAVE_WIDTH
        + noteWidth
        + STAVE_MARGIN

}

function generateExample(linePosition: number, notes: StaveNote[]) {

    // Create VexFlow Renderer from canvas element with id #boo
    const context = renderer.getContext();
    context.setFillStyle('black');

    const clefStave = new Stave(STAVE_MARGIN, 0, CLEF_STAVE_WIDTH);

    const errorStaveWidth = NOTE_WIDTH * linePosition;
    const errorStave = new Stave(
        STAVE_MARGIN + CLEF_STAVE_WIDTH,
        0,
        errorStaveWidth + STAVE_PADDING);
    const dataStaveWidth = NOTE_WIDTH * (notes.length - linePosition);
    const dataStave = new Stave(
        STAVE_MARGIN + CLEF_STAVE_WIDTH + errorStaveWidth + STAVE_PADDING,
        0,
        dataStaveWidth);
    // Add a clef and time signature.
    clefStave
        .addClef('treble')
        .addTimeSignature('4/4')
        .setEndBarType(BarlineType.NONE);

    errorStave
        .setBegBarType(BarlineType.NONE);
    dataStave
        .setEndBarType(BarlineType.END)

    // Connect it to the rendering context and draw!
    clefStave.setContext(context).draw();
    errorStave.setContext(context).draw();
    dataStave.setContext(context).draw();

    const errorNotes = notes.slice(0, linePosition);
    Formatter.FormatAndDraw(context, errorStave, errorNotes)
    // Create the notes
    const dataNotes = notes.slice(linePosition);

    // Format and justify the notes to 400 pixels.
    Formatter.FormatAndDraw(context, dataStave, dataNotes)

    const imageBytes = canvas.toDataURL()
    return imageBytes
}