import fs from 'node:fs';

import { describe, test } from "vitest";
import { StaveNote } from 'vexflow';
import { NOTE_TOKEN_LIST } from "../constants.mts";
import { generateStave } from './stave-generator.mts';
import { writeImage } from '../../test-helpers';

let RANDOM_SEED = 3298249760342582;
function pseudoRandom() {
    var x = Math.sin(RANDOM_SEED++) * 10000;
    return x - Math.floor(x);
}

describe('generate tabs', () => {

    test('all notes', async () => {

        const imageData = generateStave(0, NOTE_TOKEN_LIST);

        await writeImage(__dirname + '/stave-generator.test/tab-notes.test.all-notes.png', imageData);
    })

    test('all notes > random', async () => {

        const imageData = generateStave(0, NOTE_TOKEN_LIST.sort(() => .5 - pseudoRandom()));

        await writeImage(__dirname + '/stave-generator.test/tab-notes.test.all-notes-random.png', imageData);

    })

    test('examples', async () => {

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

        const imageDataWithError = generateStave(4, notes);
        const imageDataWithoutError = generateStave(0, notes);

        const imageDataForRandomNotes = generateStave(4, NOTE_TOKEN_LIST
            .sort(() => .5 - pseudoRandom())
            .slice(0, 16)
        );

        await writeImage(__dirname + '/stave-generator.test/tab-notes.test.example.png', imageDataWithError)
        await writeImage(__dirname + '/stave-generator.test/tab-notes.test.example-nobar.png', imageDataWithoutError)
        await writeImage(__dirname + '/stave-generator.test/tab-notes.test.example-random.png', imageDataForRandomNotes)
    })
})