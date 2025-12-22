/**
 * UTILITY: Route parameter normalization
 *
 * Expo Router can return route params as string, string[], or undefined.
 * This utility normalizes them to a consistent string | null format.
 */

/**
 * Normalizes an Expo Router route parameter to a single string or null
 *
 * @param param - Route parameter from useLocalSearchParams()
 * @returns Normalized string value or null if empty/missing
 *
 * @example
 * const params = useLocalSearchParams();
 * const tripId = normalizeRouteParam(params.id);
 */
export function normalizeRouteParam(
  param: string | string[] | undefined,
): string | null {
  if (!param) return null;

  // Take first element if array
  const value = Array.isArray(param) ? param[0] : param;

  // Trim and check for empty string
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
