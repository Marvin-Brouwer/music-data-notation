import { NamedError } from "@marvin-brouwer/named-error";

/**
 * ## fixed-length encoder error
 * 
 * This error represents a non-standard inside of the fixed-length encoding \
 * and may be used for both encoding and decoding.
 * 
 * Known cases: 
 * - {@link forPayloadLength} A payload size has been provided that exceeds the calculated `maxSize` \
 * _To calculate this, use the `calcMaxInputLength` function on your encoder._
 */
export class FixedLengthEncoderError extends NamedError {

  private constructor(message: string, innerError?: Error | string | unknown | undefined) {
    super('FixedLengthEncoderError', message, innerError);
  }

  static forPayloadLength = (size: number, maxSize: number) => 
    new FixedLengthEncoderError(`payload size (${size}) may not be more than ${maxSize}`);
}