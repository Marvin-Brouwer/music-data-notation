import { describe, test } from "vitest";
// import { VexTab as vt } from '../../git_modules/vextab/src/main';
import { Stave, Renderer, BarlineType, StaveNote, Voice, Formatter, Beam, type FontInfo, StemmableNote } from 'vexflow';
import fs from 'node:fs';
import { NOTE_TOKEN_LIST } from "./constants.mts";

const CLEF_STAVE_WIDTH = 70;
const STAVE_MARGIN = 10;
const STAVE_MARGIN_TOP = 20;
const STAVE_PADDING = 10;
const NOTE_WIDTH = 30;
const BAR_HEIGHT = 140;

let RANDOM_SEED = 329823749763435;
function pseudoRandom() {
    var x = Math.sin(RANDOM_SEED++) * 10000;
    return x - Math.floor(x);
}

describe('generate tabs', () => {

    test('all notes', async () => {

        const canvas = Object.assign(document.createElement('canvas'), {
            width: calculateWidth(NOTE_TOKEN_LIST.length),
            height: BAR_HEIGHT
        })

        const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
        renderer.resize(canvas.width, canvas.height);
        const cvContext = renderer.getContext();
        cvContext.fillStyle = 'white';
        cvContext.fillRect(0, 0, canvas.width, canvas.height)
        cvContext.save();

        generateExample(renderer, 0, NOTE_TOKEN_LIST);

        const imageBytes = canvas.toDataURL()
        fs.writeFileSync(__dirname + '/tab-notes.test.all-notes.png', imageBytes.substring(imageBytes.indexOf(',') + 1), { encoding: 'base64' })

    })

    test('all notes > random', async () => {

        const canvas = Object.assign(document.createElement('canvas'), {
            width: calculateWidth(NOTE_TOKEN_LIST.length),
            height: BAR_HEIGHT
        })

        const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
        renderer.resize(canvas.width, canvas.height);
        const cvContext = renderer.getContext();
        cvContext.fillStyle = 'white';
        cvContext.fillRect(0, 0, canvas.width, canvas.height)
        cvContext.save();

        generateExample(renderer, 0, NOTE_TOKEN_LIST.sort( () => .5 - pseudoRandom() ));

        const imageBytes = canvas.toDataURL()
        fs.writeFileSync(__dirname + '/tab-notes.test.all-notes-random.png', imageBytes.substring(imageBytes.indexOf(',') + 1), { encoding: 'base64' })

    })

    test('examples', async () => {

        const canvas = Object.assign(document.createElement('canvas'), {
            width: calculateWidth(16),
            height: BAR_HEIGHT
        })

        const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
        renderer.resize(canvas.width, canvas.height);
        const cvContext = renderer.getContext();
        cvContext.fillStyle = 'white';
        cvContext.fillRect(0, 0, canvas.width, canvas.height)
        cvContext.save();

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
        generateExample(renderer, 4, notes);

        const imageBytes = canvas.toDataURL()
        cvContext.clear()
        cvContext.fillStyle = 'white';
        cvContext.fillRect(0, 0, canvas.width, canvas.height)
        cvContext.save();

        generateExample(renderer, 0, notes);
        const imageBytes2 = canvas.toDataURL()

        cvContext.clear()
        cvContext.fillStyle = 'white';
        cvContext.fillRect(0, 0, canvas.width, canvas.height)
        cvContext.save();

        generateExample(renderer, 4, NOTE_TOKEN_LIST
            .sort( () => .5 - pseudoRandom() )
            .slice(0, 16)
        );
        const imageBytesRandom = canvas.toDataURL()

        fs.writeFileSync(__dirname + '/tab-notes.test.example.png', imageBytes.substring(imageBytes.indexOf(',') + 1), { encoding: 'base64' })
        fs.writeFileSync(__dirname + '/tab-notes.test.example-nobar.png', imageBytes2.substring(imageBytes.indexOf(',') + 1), { encoding: 'base64' })
        fs.writeFileSync(__dirname + '/tab-notes.test.example-random.png', imageBytesRandom.substring(imageBytes.indexOf(',') + 1), { encoding: 'base64' })
    })
})

function calculateWidth(notesLength: number) {

    const noteWidth = NOTE_WIDTH * notesLength + STAVE_PADDING

    return STAVE_MARGIN + CLEF_STAVE_WIDTH
        + noteWidth
        + STAVE_MARGIN

}

function generateExample(renderer: Renderer, linePosition: number, notes: StemmableNote[]) {

    // Create VexFlow Renderer from canvas element with id #boo
    const context = renderer.getContext();
    context.setFillStyle('black');

    const clefStave = new Stave(
        STAVE_MARGIN,
        STAVE_MARGIN_TOP,
        linePosition > 0
            ? CLEF_STAVE_WIDTH
            : CLEF_STAVE_WIDTH + STAVE_MARGIN);

    const errorStaveWidth = NOTE_WIDTH * linePosition;
    const errorStave = new Stave(
        STAVE_MARGIN + CLEF_STAVE_WIDTH,
        STAVE_MARGIN_TOP,
        errorStaveWidth + STAVE_PADDING);
    const dataStaveWidth = NOTE_WIDTH * (notes.length - linePosition);
    const dataStave = new Stave(
        STAVE_MARGIN + CLEF_STAVE_WIDTH + errorStaveWidth + STAVE_PADDING,
        STAVE_MARGIN_TOP,
        dataStaveWidth);
    // Add a clef and time signature.
    clefStave
        .addClef('treble')
        .addTimeSignature('4/4')
        .setEndBarType(BarlineType.NONE);
    errorStave
        .setBegBarType(BarlineType.NONE);
    dataStave
        .setBegBarType(BarlineType.NONE)
        .setEndBarType(BarlineType.END)

    // Connect it to the rendering context and draw!
    clefStave.setContext(context).draw();
    dataStave.setContext(context).draw();

    function drawErrorStave() {
        const errorNotes = notes.slice(0, linePosition);
        errorStave.setContext(context).draw();
        Formatter.FormatAndDraw(context, errorStave, errorNotes)

    }
    if (linePosition > 0) drawErrorStave();
    const dataNotes = linePosition > 0
        ? notes.slice(linePosition)
        : notes;

    // Format and justify the notes to 400 pixels.
    Formatter.FormatAndDraw(context, dataStave, dataNotes)
}