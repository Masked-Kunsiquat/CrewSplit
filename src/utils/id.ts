/**
 * UTILITIES - ID Generation
 */

/**
 * Generate a unique ID
 * Uses timestamp + random string for uniqueness
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};
