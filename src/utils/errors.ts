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

/**
 * Domain-specific error factories
 */

/**
 * Create an FX rate error with standardized metadata
 *
 * @param code - Error code (MISSING_FX_RATE, STALE_FX_RATE, etc.)
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @param details - Optional additional error details
 * @returns AppError with fromCurrency and toCurrency in details
 */
export function createFxRateError(
  code:
    | "MISSING_FX_RATE"
    | "STALE_FX_RATE"
    | "FX_CACHE_NOT_INITIALIZED"
    | "FX_RATE_NOT_FOUND"
    | "INVALID_FX_RATE"
    | "FX_RATE_REQUIRED"
    | "FX_RATE_INVALID",
  fromCurrency: string,
  toCurrency: string,
  details?: Record<string, unknown>,
): AppError<typeof code> {
  return createAppError(
    code,
    `Exchange rate error: ${fromCurrency} → ${toCurrency}`,
    {
      details: {
        fromCurrency,
        toCurrency,
        ...details,
      },
    },
  );
}

/**
 * Create a validation error with field metadata
 *
 * @param code - Error code
 * @param field - Field name that failed validation
 * @param message - Error message
 * @param details - Optional additional error details
 * @returns AppError with field in details
 */
export function createValidationError<Code extends string>(
  code: Code,
  field: string,
  message: string,
  details?: Record<string, unknown>,
): AppError<Code> {
  return createAppError(code, message, {
    details: {
      field,
      ...details,
    },
  });
}

/**
 * Create a not found error with resource metadata
 *
 * @param code - Error code
 * @param resourceType - Type of resource (e.g., "Trip", "Expense")
 * @param resourceId - ID of the resource
 * @returns AppError with resourceType and resourceId in details
 */
export function createNotFoundError<Code extends string>(
  code: Code,
  resourceType: string,
  resourceId: string,
): AppError<Code> {
  return createAppError(code, `${resourceType} not found: ${resourceId}`, {
    details: {
      resourceType,
      resourceId,
    },
  });
}
