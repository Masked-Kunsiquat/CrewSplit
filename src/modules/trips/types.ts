/**
 * TRIPS MODULE - Type Definitions
 * Core data structures for trips
 */

export interface Trip {
  id: string;
  name: string;
  description?: string;
  startDate: string; // ISO 8601
  endDate?: string; // ISO 8601
  currency: string; // Alias of currencyCode (kept in sync, not independently writable)
  currencyCode: string; // Canonical trip currency code (ISO 4217)
  emoji?: string; // Optional emoji for visual identification
  createdAt: string;
  updatedAt: string;
  isSampleData?: boolean; // Indicates if this is sample data
  sampleDataTemplateId?: string; // Template ID for sample data
}

export interface CreateTripInput {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  currencyCode: string;
  emoji?: string;
}

export interface UpdateTripInput {
  name?: string;
  description?: string;
  endDate?: string | null; // null explicitly clears the end date
  currencyCode?: string;
  emoji?: string;
}
