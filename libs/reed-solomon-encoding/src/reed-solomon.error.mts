import { NamedError } from "@marvin-brouwer/named-error";

/**
 * ## reed-solomon encoder error
 * 
 * This error represents a non-standard inside of the fixed-length encoding \
 * and may be used for both encoding and decoding.
 * 
 * Known cases: 
 * - {@link forTotalLength} A payload size has been provided that is either 
 * less than 1 or less than the configured `parityBytes`
 * - {@link forIncorrectBlockSize} A `blockSize` has been configured that is either 
 * less than 0, more than 255, or less than the configured `parityBytes`
 * - {@link forIncorrectParityBytes} The `parityBytes` configured are less than 0
 * - {@link forEncodingError} Executing the reed-solomon encoding failed unexpectedly
 * - {@link forDecodingError} Executing the reed-solomon decoding failed unexpectedly
 */
export class ReedSolomonEncoderError extends NamedError {

  private constructor(message: string, innerError?: Error | string | unknown | undefined) {
    super('ReedSolomonEncoderError', message, innerError);
  }

  static forTotalLength = ()=> new ReedSolomonEncoderError('totalLength must be more than 1 and more than parityBytes');
  static forIncorrectBlockSize = ()=> new ReedSolomonEncoderError('blockLength is of unusable size');
  static forIncorrectParityBytes = () => new ReedSolomonEncoderError('parityBytes must be > 0');
  
  static forEncodingError = (e: unknown) => new ReedSolomonEncoderError('Reed Solomon encoding failed', e);
  static forDecodingError = (e: unknown) => new ReedSolomonEncoderError('Reed Solomon decoding failed', e);
}