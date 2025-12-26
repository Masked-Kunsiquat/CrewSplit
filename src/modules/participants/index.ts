/**
 * PARTICIPANTS MODULE
 * Manages trip participants and their relationships
 * SYSTEM ARCHITECT: Core domain entity
 */

export * from "./types";
export * from "./hooks";

// Query functions (read-only) are exported for cross-module use
// Mutations should use hooks/service layer
export { getParticipantsForTrip, getParticipantById } from "./repository";
