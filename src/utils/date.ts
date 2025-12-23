/**
 * UTILITIES - Date Formatting
 * Centralized date formatting functions for consistent display across the app
 */

/**
 * Format ISO date to readable string (medium format)
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
 * Format ISO date to short string
 * @param isoDate - ISO 8601 date string or Date object
 * @returns Formatted date (e.g., "1/15/24")
 */
export const formatDateShort = (isoDate: string | Date): string => {
  const date = typeof isoDate === "string" ? new Date(isoDate) : isoDate;
  return date.toLocaleDateString("en-US", {
    year: "2-digit",
    month: "numeric",
    day: "numeric",
  });
};

/**
 * Format ISO date to long string with day of week
 * @param isoDate - ISO 8601 date string or Date object
 * @returns Formatted date (e.g., "Monday, January 15, 2024")
 */
export const formatDateLong = (isoDate: string | Date): string => {
  const date = typeof isoDate === "string" ? new Date(isoDate) : isoDate;
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Format ISO date to date and time string
 * @param isoDate - ISO 8601 date string or Date object
 * @returns Formatted date and time (e.g., "Jan 15, 2024 at 3:30 PM")
 */
export const formatDateTime = (isoDate: string | Date): string => {
  const date = typeof isoDate === "string" ? new Date(isoDate) : isoDate;
  const datePart = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart} at ${timePart}`;
};

/**
 * Get current ISO date string
 */
export const getCurrentISODate = (): string => {
  return new Date().toISOString();
};
