import { isEncoderError } from "./encoder-error.mts";

export const repeat = (amount: number, input: string) => Array.from({ length: amount }, () => input).join('');
export const stringToStream = (value: string) => new TextEncoder().encode(value);
export const streamToString = (value: Uint8Array<ArrayBufferLike>) => {
    
    // This shouldn't happen, but rethrowing when this happens makes debugging easier.
    if (isEncoderError(value)) throw value;
    return new TextDecoder('utf-8').decode(value);
}