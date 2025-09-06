import { EncoderError } from "../encoder-error.mts";

export class FixedLengthEncoderError extends EncoderError {

  static forPayloadLength = (size: number, maxSize: number) => 
    new FixedLengthEncoderError(`payload size (${size}) may not be more than ${maxSize}`);
}