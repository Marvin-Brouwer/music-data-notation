import { EncoderError } from "../encoder-error.mts";

export class ReedSolomonEncoderError extends EncoderError {

  static forPayloadLength = ()=> new ReedSolomonEncoderError('payload size must be more than 1 and more than parityBytes');
  static forTotalLength = ()=> new ReedSolomonEncoderError('totalLength must be more than 1 and more than parityBytes');
  static forIncorrectParityBytes = () => new ReedSolomonEncoderError('parityBytes must be > 0');
  static forEncodingError = (e: unknown) => new ReedSolomonEncoderError('Reed Solomon encoding failed', e);
  static forBlockLengthMismatch = (blockLength: number, expectedBlockLength: number) =>
    new ReedSolomonEncoderError(`Block length ${blockLength} cannot be less than the payload length + parityBytes ${expectedBlockLength}`);

  static forDecodingError = (e: unknown) => new ReedSolomonEncoderError('Reed Solomon decoding failed', e);
  static forPayloadLengthMismatch = (payloadLength: number, expectedPayloadLenght: number) => new ReedSolomonEncoderError(
    `Decoded payload length (${payloadLength}) does not match expected (${expectedPayloadLenght})`
  );
}