import fs from 'node:fs';

import { describe, test } from "vitest";
import { StaveNote } from 'vexflow';
import { NOTE_TOKEN_LIST } from "./constants.mts";
import { generateStave } from './stave-generator.mts';

let RANDOM_SEED = 329823749763435;
function pseudoRandom() {
    var x = Math.sin(RANDOM_SEED++) * 10000;
    return x - Math.floor(x);
}

describe('generate tabs', () => {

    test('all notes', async () => {

        const imageBytes = generateStave(0, NOTE_TOKEN_LIST);

        fs.writeFileSync(__dirname + '/tab-notes.test.all-notes.png', imageBytes.substring(imageBytes.indexOf(',') + 1), { encoding: 'base64' })

    })

    test('all notes > random', async () => {

        const imageBytes = generateStave(0, NOTE_TOKEN_LIST.sort(() => .5 - pseudoRandom()));

        fs.writeFileSync(__dirname + '/tab-notes.test.all-notes-random.png', imageBytes.substring(imageBytes.indexOf(',') + 1), { encoding: 'base64' })

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

        const imageBytes = generateStave(4, notes);
        const imageBytes2 = generateStave(0, notes);

        const imageBytesRandom = generateStave(4, NOTE_TOKEN_LIST
            .sort(() => .5 - pseudoRandom())
            .slice(0, 16)
        );

        fs.writeFileSync(__dirname + '/tab-notes.test.example.png', imageBytes.substring(imageBytes.indexOf(',') + 1), { encoding: 'base64' })
        fs.writeFileSync(__dirname + '/tab-notes.test.example-nobar.png', imageBytes2.substring(imageBytes.indexOf(',') + 1), { encoding: 'base64' })
        fs.writeFileSync(__dirname + '/tab-notes.test.example-random.png', imageBytesRandom.substring(imageBytes.indexOf(',') + 1), { encoding: 'base64' })
    })
})