import { describe, test } from "vitest";
import { musicNotationEncoder } from "./music-notation-encoder.mts";
import { writeImage } from '@marvin-brouwer/tools';


    // const canvas = Object.assign(document.createElement('canvas'), {
    //     width: calculateWidth(notes.length),
    //     height: BAR_HEIGHT
    // })
const BAR_HEIGHT = 140;

describe('music-notation-encoder', () => {

    test('example', async () => {

        const input = "this is a test";

        // TODO this doesn't draw notes when error bar = 0
        const sut = musicNotationEncoder();

        const result = sut.encode(input) as ImageData;

        await writeImage(__dirname + '/music-notation-encoder.test/example.png', result)
    })
})