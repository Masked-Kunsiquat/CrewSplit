/**
 * DATABASE MAPPERS - Trip
 * LOCAL DATA ENGINEER: Convert between DB rows and domain models
 */

import type { Trip, NewTrip } from "../schema/trips";

/**
 * Domain model for Trip (currently identical to DB model)
 * Future: Add computed fields or denormalized data here
 */
export interface TripDomain extends Trip {
  // Helper methods can be added here in the future
}

/**
 * Map Trip database row to domain model
 */
export function mapTripFromDb(record: Trip): TripDomain {
  return {
    ...record,
  };
}

/**
 * Map array of Trips from DB
 */
export function mapTripsFromDb(records: Trip[]): TripDomain[] {
  return records.map(mapTripFromDb);
}
