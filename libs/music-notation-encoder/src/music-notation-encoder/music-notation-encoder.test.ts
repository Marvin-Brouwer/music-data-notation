import { describe, test } from "vitest";
import { musicNotationEncoder } from "./music-notation-encoder";
import { writeImage } from "../test-helpers";
import { isEncoderError } from "../encoder-error.mts";

describe('music-notation-encoder', () => {

    test('example', async () => {

        const input = "this is a test";

        // TODO this doesn't draw notes when error bar = 0
        const sut = musicNotationEncoder();

        const result = sut.encode(input);

        if(isEncoderError(result)) throw result;
        await writeImage(__dirname + '/music-notation-encoder.test/example.png', result)
    })
})