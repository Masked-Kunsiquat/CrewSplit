export type AppError<Code extends string = string> = Error & {
  code: Code;
  status?: number;
  details?: Record<string, unknown>;
};

export function createAppError<Code extends string>(
  code: Code,
  message: string,
  options?: Readonly<{
    status?: number;
    details?: Record<string, unknown>;
    cause?: unknown;
  }>,
): AppError<Code> {
  const error = new Error(message) as AppError<Code>;
  error.code = code;
  if (typeof options?.status === "number") error.status = options.status;
  if (options?.details) error.details = options.details;
  if (options?.cause !== undefined) {
    (error as Error & { cause?: unknown }).cause = options.cause;
  }
  return error;
}
