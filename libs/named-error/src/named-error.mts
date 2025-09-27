/**
 * Represents a failure that occurred with a specific name
 *
 * @remarks
 * Instances should be returned directly from functions that encounter a problem, not thrown.
 * If the underlying cause is already an `Error` (or `NamedError`), it should be propagated
 * unchanged; otherwise the original `Error` is wrapped so callers have a
 * uniform shape to work with.
 */
export abstract class NamedError extends Error {
  /** The original exception that triggered this error, if any. */
  public readonly innerError?: Error;

  /**
   * Construct a new `NamedError`.
   *
   * @param name    Human‑readable error name.
   * @param message    Human‑readable description of the failure.
   * @param innerError Optional original error that caused the problem.
   */
  protected constructor(name: string, message: string, innerError?: Error | string | unknown | undefined) {
    super(message);
    this.name = name;
    if (innerError instanceof Error)
      this.innerError = innerError;
    else if (typeof innerError === 'string')
      this.innerError = new Error(innerError);
  }
}

export function isError(result: unknown): result is Error {
  return result instanceof Error;
}