import { EncoderError } from "../encoder-error.mts";
import type { TokenList } from "./fixed-length-encoding.mts";

export class FixedLengthEncoderError extends EncoderError {
    static forUnknownSymbol = (symbol: string, tokenList: TokenList) => {
        const error = new FixedLengthEncoderError(`Symbol "${symbol}" not found in tokenList`);
        return Object.assign(error, { get allowedTokens() { return tokenList } });
    }
    static forLessThanParityLength = (inputLength: number, paritySymbolCount: number) => new FixedLengthEncoderError(
        `Input length of ${inputLength} is less than the parity count of ${paritySymbolCount}, `+
        `the input should at minimum be twice the parity count (${paritySymbolCount * 2}).`
    );
    static forLessThanOutputLength = (inputLength: number, expectedOutputLength: number) => new FixedLengthEncoderError(
        `Expected ${expectedOutputLength} symbols, but the input is less than ${inputLength}.`
    );
    static forInsufficientBytes = (recoveredBytesLength: number, fullBlockLength: number) => new FixedLengthEncoderError(
        `Insufficient bytes (${recoveredBytesLength}) for full Reed‑Solomon verification (need ${fullBlockLength}).`
    );

}