
export const repeat = (amount: number, input: string) => Array.from({ length: amount }, () => input).join('');
export const stringToStream = (value: string) => new TextEncoder().encode(value);
export const streamToString = (value: Uint8Array<ArrayBufferLike>) => new TextDecoder('utf-8').decode(value);