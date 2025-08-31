export function packBaseN(bytes: Uint8Array, tokenList: string[], outputLength: number): string[] {
  const base = BigInt(tokenList.length);

  // Convert bytes → BigInt
  let num = 0n;
  for (let b of bytes) {
    num = (num << 8n) + BigInt(b);
  }

  // Convert BigInt → base-N digits
  let digits: number[] = [];
  while (num > 0n) {
    digits.push(Number(num % base));
    num /= base;
  }
  digits.reverse();

  // Pad/truncate to fixed length
  while (digits.length < outputLength) digits.unshift(0);
  digits = digits.slice(-outputLength);

  return digits.map(d => tokenList[d]);
}

export function unpackBaseN(tokens: string[], tokenList: string[]): Uint8Array {
  const base = BigInt(tokenList.length);

  // Convert tokens → digits
  const digits = tokens.map(t => tokenList.indexOf(t));

  // Convert base-N digits → BigInt
  let num = 0n;
  for (let d of digits) {
    num = num * base + BigInt(d);
  }

  // Convert BigInt → bytes
  const bytes: number[] = [];
  while (num > 0n) {
    bytes.unshift(Number(num & 0xffn));
    num >>= 8n;
  }

  return new Uint8Array(bytes);
}