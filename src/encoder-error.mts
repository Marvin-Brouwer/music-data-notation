/**
 * @file DecodingError.ts
 * @description Centralized error type used throughout the token‑encoding pipeline.
 *
 * The class is deliberately lightweight – it contains no behavior beyond
 * construction – because the surrounding code prefers **error‑as‑value**
 * handling over exceptions.
 */

/**
 * Represents a failure that occurred while decoding a token.
 *
 * @remarks
 * Instances are returned directly from functions that encounter a problem.
 * If the underlying cause is already a `DecodingError`, it is propagated
 * unchanged; otherwise the original `Error` is wrapped so callers have a
 * uniform shape to work with.
 */
export class EncoderError extends Error {
  /** The original exception that triggered this error, if any. */
  public readonly innerError?: Error;

  /**
   * Construct a new `DecodingError`.
   *
   * @param message    Human‑readable description of the failure.
   * @param innerError Optional original error that caused the problem.
   */
  protected constructor(message: string, innerError?: Error | string | unknown | undefined) {
    super(message);
    this.name = 'EncoderError';
    if (innerError instanceof Error)
      this.innerError = innerError;
    else if (typeof innerError === 'string')
      this.innerError = new Error(innerError);
  }
}

export function isEncoderError(result: unknown): result is EncoderError {
  return result instanceof EncoderError;
}