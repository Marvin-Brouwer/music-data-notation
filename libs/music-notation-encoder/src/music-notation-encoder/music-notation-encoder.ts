import { EncoderError, isEncoderError } from "../encoder-error.mts";
import { fixedLengthEncoder } from "../fixed-length-encoding/fixed-length-encoder.mts";
import { NOTE_TOKEN_LIST } from "./constants.mts";
import { generateStave } from "./encoding/stave-generator.mts";

export function musicNotationEncoder() {

    const textEncoder = new TextEncoder();
    const flEncoder = fixedLengthEncoder({
        outputLength: 16,
        tokenList: NOTE_TOKEN_LIST
    });

    function encode(text: string): ImageData | EncoderError {
        const inputStream = textEncoder.encode(text);
        const encodedText = flEncoder.encodeBytes(inputStream);
        if (isEncoderError(encodedText)) return encodedText;
        console.log(encodedText.map(note => note.keys))

        const imageData = generateStave(4, encodedText);

        return imageData;
    }

    return {
        encode
    }
}