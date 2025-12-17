/**
 * UTILITIES - Date Formatting
 */

/**
 * Format ISO date to readable string
 * @param isoDate - ISO 8601 date string
 * @returns Formatted date (e.g., "Jan 15, 2024")
 */
export const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Get current ISO date string
 */
export const getCurrentISODate = (): string => {
  return new Date().toISOString();
};
