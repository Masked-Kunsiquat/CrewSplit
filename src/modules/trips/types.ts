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
  currency: string; // ISO 4217 (USD, EUR, etc.)
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripInput {
  name: string;
  description?: string;
  startDate: string;
  currency?: string;
}

export interface UpdateTripInput {
  name?: string;
  description?: string;
  endDate?: string;
}
