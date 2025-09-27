import fs from 'node:fs/promises';

export const repeat = (amount: number, input: string) => Array.from({ length: amount }, () => input).join('');
export const stringToStream = (value: string) => new TextEncoder().encode(value);
export const streamToString = (value: Uint8Array<ArrayBufferLike>) => {
    
    // This shouldn't happen, but rethrowing when this happens makes debugging easier.
    if (value instanceof Error) throw value;
    return new TextDecoder('utf-8').decode(value);
}

export async function writeImage(path: string, imageData: ImageData) {
    if (imageData === undefined || imageData.data.length === 0) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);

    const dataUrl = canvas.toDataURL(); 
    const imageBytes = dataUrl.substring(dataUrl.indexOf(',') + 1);

    await fs.writeFile(path, imageBytes, { encoding: 'base64' })
}