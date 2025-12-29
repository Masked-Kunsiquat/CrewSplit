/**
 * AUTOMERGE MODULE - Engine Public API
 */

export {
  createEmptyTripDoc,
  updateTripMetadata,
  createParticipant,
  updateParticipant,
  createExpense,
  updateExpense,
  createSettlement,
  updateSettlement,
  validateTripDoc,
} from "./doc-operations";

export type {
  TripAutomergeDoc,
  TripParticipant,
  TripExpense,
  TripExpenseSplit,
  TripSettlement,
  TripMetadata,
} from "./doc-schema";

export { CURRENT_SCHEMA_VERSION } from "./doc-schema";
