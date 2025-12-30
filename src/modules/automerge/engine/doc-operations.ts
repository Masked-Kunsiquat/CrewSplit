/**
 * AUTOMERGE MODULE - Document Operations
 * MODELER: Pure functions for Automerge document CRUD operations
 * PURE FUNCTIONS: No side effects, deterministic, no external dependencies
 *
 * All functions here operate on plain data structures (TripAutomergeDoc).
 * They do NOT perform Automerge mutations directly - that happens in the service layer.
 * These functions return the data to be applied to the document.
 */

import type {
  TripAutomergeDoc,
  TripParticipant,
  TripExpense,
  TripSettlement,
} from "./doc-schema";
import { CURRENT_SCHEMA_VERSION } from "./doc-schema";

/**
 * Creates an initial empty trip document structure
 *
 * @param tripData - Initial trip data (id, name, currency, etc.)
 * @returns Empty trip document with metadata
 *
 * @precondition tripData must have valid id, name, currency, startDate
 * @postcondition Returns valid TripAutomergeDoc with empty collections
 * @postcondition schemaVersion set to CURRENT_SCHEMA_VERSION
 *
 * @example
 * const doc = createEmptyTripDoc({
 *   id: 'trip-1',
 *   name: 'Paris Trip',
 *   emoji: '🗼',
 *   currency: 'EUR',
 *   startDate: '2024-01-01',
 *   endDate: null,
 *   createdAt: '2024-01-01T00:00:00Z',
 *   updatedAt: '2024-01-01T00:00:00Z',
 * });
 */
export function createEmptyTripDoc(tripData: {
  id: string;
  name: string;
  emoji: string;
  currency: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}): TripAutomergeDoc {
  return {
    id: tripData.id,
    name: tripData.name,
    emoji: tripData.emoji,
    currency: tripData.currency,
    startDate: tripData.startDate,
    endDate: tripData.endDate,
    createdAt: tripData.createdAt,
    updatedAt: tripData.updatedAt,
    participants: {},
    expenses: {},
    settlements: {},
    _metadata: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      lastSyncedAt: null,
    },
  };
}

/**
 * Updates trip metadata fields
 *
 * @param updates - Fields to update (name, emoji, currency, etc.)
 * @param updatedAt - Timestamp for the update (ISO 8601 string)
 * @returns Object with fields to update in the document
 *
 * @precondition updates must contain at least one valid field
 * @precondition updatedAt must be a valid ISO 8601 timestamp
 * @postcondition Returns only the fields that should be updated
 * @postcondition updatedAt is always included
 *
 * @example
 * const updates = updateTripMetadata({
 *   name: 'New Trip Name',
 *   emoji: '🎉',
 * }, '2024-01-01T12:00:00Z');
 * // Returns: { name: 'New Trip Name', emoji: '🎉', updatedAt: '2024-01-01T12:00:00Z' }
 */
export function updateTripMetadata(
  updates: {
    name?: string;
    emoji?: string;
    currency?: string;
    startDate?: string;
    endDate?: string | null;
  },
  updatedAt: string
): Partial<TripAutomergeDoc> {
  return {
    ...updates,
    updatedAt,
  };
}

/**
 * Creates participant data for insertion into the document
 *
 * @param participant - Participant data
 * @returns Participant object ready for insertion
 *
 * @precondition participant must have valid id, name, color
 * @postcondition Returns valid TripParticipant
 *
 * @example
 * const participant = createParticipant({
 *   id: 'p1',
 *   name: 'Alice',
 *   color: '#FF5733',
 *   createdAt: '2024-01-01T00:00:00Z',
 *   updatedAt: '2024-01-01T00:00:00Z',
 * });
 */
export function createParticipant(participant: {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}): TripParticipant {
  return {
    id: participant.id,
    name: participant.name,
    color: participant.color,
    createdAt: participant.createdAt,
    updatedAt: participant.updatedAt,
  };
}

/**
 * Updates participant fields
 *
 * @param updates - Fields to update
 * @param updatedAt - Timestamp for the update (ISO 8601 string)
 * @returns Object with fields to update
 *
 * @precondition updates must contain at least one valid field
 * @precondition updatedAt must be a valid ISO 8601 timestamp
 * @postcondition Returns only the fields that should be updated
 * @postcondition updatedAt is always included
 *
 * @example
 * const updates = updateParticipant({ name: 'Alice Smith' }, '2024-01-01T12:00:00Z');
 * // Returns: { name: 'Alice Smith', updatedAt: '2024-01-01T12:00:00Z' }
 */
export function updateParticipant(
  updates: {
    name?: string;
    color?: string;
  },
  updatedAt: string
): Partial<TripParticipant> {
  return {
    ...updates,
    updatedAt,
  };
}

/**
 * Creates expense data for insertion into the document
 *
 * @param expense - Expense data including splits
 * @returns Expense object ready for insertion
 *
 * @precondition expense must have valid id, description, amounts, paidById, date
 * @precondition splits must be keyed by participantId
 * @postcondition Returns valid TripExpense
 *
 * @example
 * const expense = createExpense({
 *   id: 'e1',
 *   description: 'Dinner',
 *   originalAmountMinor: 5000,
 *   originalCurrency: 'USD',
 *   convertedAmountMinor: 5000,
 *   fxRateToTrip: null,
 *   categoryId: null,
 *   paidById: 'p1',
 *   date: '2024-01-01',
 *   splits: {
 *     p1: { shareType: 'equal', shareValue: 1 },
 *     p2: { shareType: 'equal', shareValue: 1 },
 *   },
 *   createdAt: '2024-01-01T00:00:00Z',
 *   updatedAt: '2024-01-01T00:00:00Z',
 * });
 */
export function createExpense(expense: {
  id: string;
  description: string;
  originalAmountMinor: number;
  originalCurrency: string;
  convertedAmountMinor: number;
  fxRateToTrip: number | null;
  categoryId: string | null;
  paidById: string;
  date: string;
  splits: {
    [participantId: string]: {
      shareType: "equal" | "percentage" | "exact_amount" | "shares";
      shareValue: number;
    };
  };
  createdAt: string;
  updatedAt: string;
}): TripExpense {
  return {
    id: expense.id,
    description: expense.description,
    originalAmountMinor: expense.originalAmountMinor,
    originalCurrency: expense.originalCurrency,
    convertedAmountMinor: expense.convertedAmountMinor,
    fxRateToTrip: expense.fxRateToTrip,
    categoryId: expense.categoryId,
    paidById: expense.paidById,
    date: expense.date,
    splits: expense.splits,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

/**
 * Updates expense fields
 *
 * @param updates - Fields to update
 * @param updatedAt - Timestamp for the update (ISO 8601 string)
 * @returns Object with fields to update
 *
 * @precondition updates must contain at least one valid field
 * @precondition updatedAt must be a valid ISO 8601 timestamp
 * @postcondition Returns only the fields that should be updated
 * @postcondition updatedAt is always included
 *
 * @example
 * const updates = updateExpense({
 *   description: 'Lunch',
 *   originalAmountMinor: 3000,
 * }, '2024-01-01T12:00:00Z');
 */
export function updateExpense(
  updates: {
    description?: string;
    originalAmountMinor?: number;
    originalCurrency?: string;
    convertedAmountMinor?: number;
    fxRateToTrip?: number | null;
    categoryId?: string | null;
    paidById?: string;
    date?: string;
    splits?: {
      [participantId: string]: {
        shareType: "equal" | "percentage" | "exact_amount" | "shares";
        shareValue: number;
      };
    };
  },
  updatedAt: string
): Partial<TripExpense> {
  return {
    ...updates,
    updatedAt,
  };
}

/**
 * Creates settlement data for insertion into the document
 *
 * @param settlement - Settlement data
 * @returns Settlement object ready for insertion
 *
 * @precondition settlement must have valid id, fromParticipantId, toParticipantId, amounts
 * @postcondition Returns valid TripSettlement
 *
 * @example
 * const settlement = createSettlement({
 *   id: 's1',
 *   fromParticipantId: 'p2',
 *   toParticipantId: 'p1',
 *   originalAmountMinor: 2500,
 *   originalCurrency: 'USD',
 *   convertedAmountMinor: 2500,
 *   fxRateToTrip: null,
 *   date: '2024-01-01',
 *   description: 'Payment for dinner',
 *   paymentMethod: 'venmo',
 *   expenseSplitId: null,
 *   createdAt: '2024-01-01T00:00:00Z',
 *   updatedAt: '2024-01-01T00:00:00Z',
 * });
 */
export function createSettlement(settlement: {
  id: string;
  fromParticipantId: string;
  toParticipantId: string;
  originalAmountMinor: number;
  originalCurrency: string;
  convertedAmountMinor: number;
  fxRateToTrip: number | null;
  date: string;
  description: string | null;
  paymentMethod: string | null;
  expenseSplitId: string | null;
  createdAt: string;
  updatedAt: string;
}): TripSettlement {
  return {
    id: settlement.id,
    fromParticipantId: settlement.fromParticipantId,
    toParticipantId: settlement.toParticipantId,
    originalAmountMinor: settlement.originalAmountMinor,
    originalCurrency: settlement.originalCurrency,
    convertedAmountMinor: settlement.convertedAmountMinor,
    fxRateToTrip: settlement.fxRateToTrip,
    date: settlement.date,
    description: settlement.description,
    paymentMethod: settlement.paymentMethod,
    expenseSplitId: settlement.expenseSplitId,
    createdAt: settlement.createdAt,
    updatedAt: settlement.updatedAt,
  };
}

/**
 * Updates settlement fields
 *
 * @param updates - Fields to update
 * @param updatedAt - Timestamp for the update (ISO 8601 string)
 * @returns Object with fields to update
 *
 * @precondition updates must contain at least one valid field
 * @precondition updatedAt must be a valid ISO 8601 timestamp
 * @postcondition Returns only the fields that should be updated
 * @postcondition updatedAt is always included
 *
 * @example
 * const updates = updateSettlement({
 *   description: 'Updated description',
 *   paymentMethod: 'cash',
 * }, '2024-01-01T12:00:00Z');
 */
export function updateSettlement(
  updates: {
    originalAmountMinor?: number;
    originalCurrency?: string;
    convertedAmountMinor?: number;
    fxRateToTrip?: number | null;
    date?: string;
    description?: string | null;
    paymentMethod?: string | null;
  },
  updatedAt: string
): Partial<TripSettlement> {
  return {
    ...updates,
    updatedAt,
  };
}

/**
 * Validates that a trip document has the expected structure
 *
 * @param doc - Document to validate
 * @returns true if valid, throws error otherwise
 *
 * @throws Error if document is missing required fields
 * @throws Error if document has invalid schema version
 *
 * @example
 * validateTripDoc(doc); // throws if invalid
 */
export function validateTripDoc(doc: unknown): doc is TripAutomergeDoc {
  const d = doc as TripAutomergeDoc;

  if (!d.id || typeof d.id !== "string") {
    throw new Error("Trip document missing or invalid id");
  }

  if (!d.name || typeof d.name !== "string") {
    throw new Error("Trip document missing or invalid name");
  }

  if (!d.currency || typeof d.currency !== "string") {
    throw new Error("Trip document missing or invalid currency");
  }

  if (!d._metadata || typeof d._metadata !== "object") {
    throw new Error("Trip document missing _metadata");
  }

  if (typeof d._metadata.schemaVersion !== "number") {
    throw new Error("Trip document missing or invalid schema version");
  }

  // Check that collections exist (can be empty)
  if (typeof d.participants !== "object") {
    throw new Error("Trip document missing participants collection");
  }

  if (typeof d.expenses !== "object") {
    throw new Error("Trip document missing expenses collection");
  }

  if (typeof d.settlements !== "object") {
    throw new Error("Trip document missing settlements collection");
  }

  return true;
}
