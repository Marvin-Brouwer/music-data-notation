import { EncoderError } from "../encoder-error.mts";

export class ReedSolomonEncoderError extends EncoderError {

  static forTotalLength = ()=> new ReedSolomonEncoderError('totalLength must be between 1 and 255');
  static forIncorrectParityBytes = () => new ReedSolomonEncoderError('parityBytes must be > 0');
  static forEncodingError = (e: unknown) => new ReedSolomonEncoderError('Reed Solomon encoding failed', e);

  static forBlockLengthMismatch = (blockLength: number, expectedBlockLength: number) =>
    new ReedSolomonEncoderError(`Block length ${blockLength} does not match expected ${expectedBlockLength}`);
  static forDecodingError = (e: unknown) => new ReedSolomonEncoderError('Reed Solomon decoding failed', e);
  static forPayloadLengthMismatch = (payloadLength: number, expectedPayloadLenght: number) => new ReedSolomonEncoderError(
    `Decoded payload length (${payloadLength}) does not match expected (${expectedPayloadLenght})`
  );
}