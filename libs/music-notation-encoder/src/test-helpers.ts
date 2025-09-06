import { isEncoderError } from "./encoder-error.mts";
import fs from 'node:fs/promises';

export const repeat = (amount: number, input: string) => Array.from({ length: amount }, () => input).join('');
export const stringToStream = (value: string) => new TextEncoder().encode(value);
export const streamToString = (value: Uint8Array<ArrayBufferLike>) => {
    
    // This shouldn't happen, but rethrowing when this happens makes debugging easier.
    if (isEncoderError(value)) throw value;
    return new TextDecoder('utf-8').decode(value);
}

export async function writeImage(path: string, imagedata: ImageData) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d')!;
    canvas.width = imagedata.width;
    canvas.height = imagedata.height;
    ctx.putImageData(imagedata, 0, 0);

    const dataUrl = canvas.toDataURL(); 
    const imageBytes = dataUrl.substring(dataUrl.indexOf(',') + 1);

    fs.writeFile(path, imageBytes, { encoding: 'base64' })
}