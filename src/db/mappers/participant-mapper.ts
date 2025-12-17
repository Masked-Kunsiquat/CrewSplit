/**
 * DATABASE MAPPERS - Participant
 * LOCAL DATA ENGINEER: Convert between DB rows and domain models
 */

import type { Participant } from "../schema/participants";

/**
 * Domain model for Participant (currently identical to DB model)
 * Future: Add computed fields or balance information here
 */
export type ParticipantDomain = Participant;

/**
 * Map Participant database row to domain model
 */
export function mapParticipantFromDb(record: Participant): ParticipantDomain {
  return {
    ...record,
  };
}

/**
 * Map array of Participants from DB
 */
export function mapParticipantsFromDb(
  records: Participant[],
): ParticipantDomain[] {
  return records.map(mapParticipantFromDb);
}
