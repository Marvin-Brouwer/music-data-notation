import { isError } from "@marvin-brouwer/named-error";
import { fixedLengthEncoder } from "../../fixed-length-encoding/src/fixed-length-encoder.mts";
import { NOTE_TOKEN_LIST } from "./constants.mts";
import { generateStave } from "./encoding/stave-generator.mts";

export function musicNotationEncoder() {

    const textEncoder = new TextEncoder();
    const flEncoder = fixedLengthEncoder({
        outputLength: 16,
        tokenList: NOTE_TOKEN_LIST
    });

    function encode(text: string): ImageData | Error {
        const inputStream = textEncoder.encode(text);
        const encodedText = flEncoder.encodeBytes(inputStream);
        if (isError(encodedText)) return encodedText;

        // TODO reed solomon encoder
        const imageData = generateStave(0, encodedText);

        return imageData;
    }

    return {
        encode
    }
}