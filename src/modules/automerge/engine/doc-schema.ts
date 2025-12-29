/**
 * AUTOMERGE MODULE - Document Schema
 * MODELER: Type definitions for Automerge document structure
 * PURE TYPES: No logic, just type definitions
 *
 * This file defines the TypeScript types for the Automerge document structure.
 * Each trip is stored as a single Automerge document containing all trip data,
 * participants, expenses, expense splits, and settlements.
 */

/**
 * Participant data within the Automerge document
 */
export interface TripParticipant {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Expense split data within an expense
 */
export interface TripExpenseSplit {
  shareType: "equal" | "percentage" | "exact_amount" | "shares";
  shareValue: number;
}

/**
 * Expense data within the Automerge document
 */
export interface TripExpense {
  id: string;
  description: string;
  originalAmountMinor: number;
  originalCurrency: string;
  convertedAmountMinor: number;
  fxRateToTrip: number | null;
  categoryId: string | null;
  paidById: string;
  date: string;
  createdAt: string;
  updatedAt: string;

  // Splits keyed by participantId
  splits: {
    [participantId: string]: TripExpenseSplit;
  };
}

/**
 * Settlement data within the Automerge document
 */
export interface TripSettlement {
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
}

/**
 * Metadata for the Automerge document
 */
export interface TripMetadata {
  schemaVersion: number;
  lastSyncedAt: string | null;
}

/**
 * Complete Automerge document structure for a trip
 *
 * This is the authoritative data structure. All trip data is stored here,
 * and SQLite is derived from this document.
 */
export interface TripAutomergeDoc {
  // Trip metadata
  id: string;
  name: string;
  emoji: string;
  currency: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;

  // Participants (keyed by participantId)
  participants: {
    [participantId: string]: TripParticipant;
  };

  // Expenses (keyed by expenseId)
  expenses: {
    [expenseId: string]: TripExpense;
  };

  // Settlements (keyed by settlementId)
  settlements: {
    [settlementId: string]: TripSettlement;
  };

  // Internal metadata
  _metadata: TripMetadata;
}

/**
 * Current schema version
 * Increment this when making breaking changes to the document structure
 */
export const CURRENT_SCHEMA_VERSION = 1;
