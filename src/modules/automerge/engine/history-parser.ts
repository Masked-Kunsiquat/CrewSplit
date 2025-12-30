/**
 * AUTOMERGE MODULE - History Parser Engine
 * MODELER: Pure functions for parsing Automerge operation log into human-readable changes
 * PURE FUNCTIONS: No side effects, no dependencies (except types)
 *
 * This module parses Automerge's getHistory() output into structured change events
 * that can be displayed in the UI. Each change represents a single modification
 * to the trip document (add participant, update expense, etc.)
 */

import type * as Automerge from "@automerge/automerge";
import type { TripAutomergeDoc } from "../types";

/**
 * Type of change made to the document
 */
export type ChangeType =
  | "trip_created"
  | "trip_updated"
  | "participant_added"
  | "participant_updated"
  | "participant_removed"
  | "expense_added"
  | "expense_updated"
  | "expense_removed"
  | "settlement_added"
  | "settlement_updated"
  | "settlement_removed"
  | "unknown";

/**
 * Parsed change event
 */
export interface ParsedChange {
  /** Type of change */
  type: ChangeType;
  /** ISO timestamp of the change */
  timestamp: string;
  /** Human-readable change message from Automerge */
  message: string;
  /** Actor ID who made the change */
  actorId: string;
  /** Raw change object from Automerge */
  rawChange: Automerge.DecodedChange;
  /** Parsed details about what changed */
  details: ChangeDetails;
}

/**
 * Details about what changed in a specific modification
 */
export interface ChangeDetails {
  /** For participant/expense/settlement changes: the ID of the entity */
  entityId?: string;
  /** For entity updates: field-level changes */
  fieldChanges?: FieldChange[];
  /** Snapshot of the entity before the change (if available) */
  beforeSnapshot?: unknown;
  /** Snapshot of the entity after the change */
  afterSnapshot?: unknown;
}

/**
 * Represents a single field change
 */
export interface FieldChange {
  fieldPath: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * Parse Automerge history into human-readable change events
 *
 * Takes the output of Automerge.getHistory() and converts it into
 * structured change events that can be displayed in the UI.
 *
 * @param history - Array of states from Automerge.getHistory()
 * @returns Array of parsed changes, sorted newest-first
 *
 * @example
 * const history = Automerge.getHistory(doc);
 * const changes = parseHistory(history);
 * // changes[0] = { type: 'expense_added', timestamp: '2024-01-01T00:00:00Z', ... }
 */
export function parseHistory(
  history: { change: Automerge.DecodedChange; snapshot: TripAutomergeDoc }[],
): ParsedChange[] {
  const changes: ParsedChange[] = [];

  for (let i = 0; i < history.length; i++) {
    const { change, snapshot } = history[i];
    const previousSnapshot = i > 0 ? history[i - 1].snapshot : null;

    const parsedChange = parseChange(change, snapshot, previousSnapshot);
    changes.push(parsedChange);
  }

  // Sort newest-first (reverse chronological)
  return changes.reverse();
}

/**
 * Parse a single Automerge change into a structured event
 *
 * @param change - The decoded Automerge change
 * @param snapshot - Document state after this change
 * @param previousSnapshot - Document state before this change (or null if first change)
 * @returns Parsed change event
 */
function parseChange(
  change: Automerge.DecodedChange,
  snapshot: TripAutomergeDoc,
  previousSnapshot: TripAutomergeDoc | null,
): ParsedChange {
  const message = change.message || "Untitled change";
  const timestamp = change.time
    ? new Date(change.time * 1000).toISOString()
    : new Date().toISOString();
  const actorId = change.actor;

  // Determine change type by analyzing the message
  const type = inferChangeType(message);
  const details = extractChangeDetails(
    type,
    message,
    snapshot,
    previousSnapshot,
  );

  return {
    type,
    timestamp,
    message,
    actorId,
    rawChange: change,
    details,
  };
}

/**
 * Infer change type from the change message
 *
 * This analyzes the message string that was passed to Automerge.change()
 * to determine what kind of change it represents.
 *
 * @param message - The change message (e.g., "Add participant", "Update expense")
 * @returns The inferred change type
 */
function inferChangeType(message: string): ChangeType {
  const lowerMessage = message.toLowerCase();

  // Trip changes
  if (
    lowerMessage.includes("initialize trip") ||
    lowerMessage === "initialized"
  ) {
    return "trip_created";
  }
  if (lowerMessage.includes("update trip")) {
    return "trip_updated";
  }

  // Participant changes
  if (lowerMessage.includes("add participant")) {
    return "participant_added";
  }
  if (lowerMessage.includes("update participant")) {
    return "participant_updated";
  }
  if (lowerMessage.includes("remove participant")) {
    return "participant_removed";
  }

  // Expense changes
  if (lowerMessage.includes("add expense")) {
    return "expense_added";
  }
  if (lowerMessage.includes("update expense")) {
    return "expense_updated";
  }
  if (lowerMessage.includes("remove expense")) {
    return "expense_removed";
  }

  // Settlement changes
  if (lowerMessage.includes("add settlement")) {
    return "settlement_added";
  }
  if (lowerMessage.includes("update settlement")) {
    return "settlement_updated";
  }
  if (lowerMessage.includes("remove settlement")) {
    return "settlement_removed";
  }

  return "unknown";
}

/**
 * Extract detailed information about what changed
 *
 * This compares the before/after snapshots to identify exactly
 * what entities and fields were modified.
 *
 * @param type - The change type
 * @param message - The change message
 * @param snapshot - Document state after change
 * @param previousSnapshot - Document state before change (or null)
 * @returns Change details
 */
function extractChangeDetails(
  type: ChangeType,
  message: string,
  snapshot: TripAutomergeDoc,
  previousSnapshot: TripAutomergeDoc | null,
): ChangeDetails {
  // If no previous snapshot, this is the initial creation
  if (!previousSnapshot) {
    return {
      afterSnapshot: snapshot,
    };
  }

  // Detect participant changes
  if (type.startsWith("participant_")) {
    return extractParticipantChanges(type, snapshot, previousSnapshot);
  }

  // Detect expense changes
  if (type.startsWith("expense_")) {
    return extractExpenseChanges(type, snapshot, previousSnapshot);
  }

  // Detect settlement changes
  if (type.startsWith("settlement_")) {
    return extractSettlementChanges(type, snapshot, previousSnapshot);
  }

  // Detect trip metadata changes
  if (type === "trip_updated") {
    return extractTripChanges(snapshot, previousSnapshot);
  }

  return {};
}

/**
 * Extract participant-specific changes
 */
function extractParticipantChanges(
  type: ChangeType,
  snapshot: TripAutomergeDoc,
  previousSnapshot: TripAutomergeDoc,
): ChangeDetails {
  const currentParticipants = Object.keys(snapshot.participants);
  const previousParticipants = Object.keys(previousSnapshot.participants);

  if (type === "participant_added") {
    // Find newly added participant
    const newId = currentParticipants.find(
      (id) => !previousParticipants.includes(id),
    );
    if (newId) {
      return {
        entityId: newId,
        afterSnapshot: snapshot.participants[newId],
      };
    }
  } else if (type === "participant_removed") {
    // Find removed participant
    const removedId = previousParticipants.find(
      (id) => !currentParticipants.includes(id),
    );
    if (removedId) {
      return {
        entityId: removedId,
        beforeSnapshot: previousSnapshot.participants[removedId],
      };
    }
  } else if (type === "participant_updated") {
    // Find updated participant
    for (const id of currentParticipants) {
      if (previousParticipants.includes(id)) {
        const before = previousSnapshot.participants[id];
        const after = snapshot.participants[id];
        const fieldChanges = compareObjects(before, after);
        if (fieldChanges.length > 0) {
          return {
            entityId: id,
            fieldChanges,
            beforeSnapshot: before,
            afterSnapshot: after,
          };
        }
      }
    }
  }

  return {};
}

/**
 * Extract expense-specific changes
 */
function extractExpenseChanges(
  type: ChangeType,
  snapshot: TripAutomergeDoc,
  previousSnapshot: TripAutomergeDoc,
): ChangeDetails {
  const currentExpenses = Object.keys(snapshot.expenses);
  const previousExpenses = Object.keys(previousSnapshot.expenses);

  if (type === "expense_added") {
    const newId = currentExpenses.find((id) => !previousExpenses.includes(id));
    if (newId) {
      return {
        entityId: newId,
        afterSnapshot: snapshot.expenses[newId],
      };
    }
  } else if (type === "expense_removed") {
    const removedId = previousExpenses.find(
      (id) => !currentExpenses.includes(id),
    );
    if (removedId) {
      return {
        entityId: removedId,
        beforeSnapshot: previousSnapshot.expenses[removedId],
      };
    }
  } else if (type === "expense_updated") {
    for (const id of currentExpenses) {
      if (previousExpenses.includes(id)) {
        const before = previousSnapshot.expenses[id];
        const after = snapshot.expenses[id];
        const fieldChanges = compareObjects(before, after);
        if (fieldChanges.length > 0) {
          return {
            entityId: id,
            fieldChanges,
            beforeSnapshot: before,
            afterSnapshot: after,
          };
        }
      }
    }
  }

  return {};
}

/**
 * Extract settlement-specific changes
 */
function extractSettlementChanges(
  type: ChangeType,
  snapshot: TripAutomergeDoc,
  previousSnapshot: TripAutomergeDoc,
): ChangeDetails {
  const currentSettlements = Object.keys(snapshot.settlements);
  const previousSettlements = Object.keys(previousSnapshot.settlements);

  if (type === "settlement_added") {
    const newId = currentSettlements.find(
      (id) => !previousSettlements.includes(id),
    );
    if (newId) {
      return {
        entityId: newId,
        afterSnapshot: snapshot.settlements[newId],
      };
    }
  } else if (type === "settlement_removed") {
    const removedId = previousSettlements.find(
      (id) => !currentSettlements.includes(id),
    );
    if (removedId) {
      return {
        entityId: removedId,
        beforeSnapshot: previousSnapshot.settlements[removedId],
      };
    }
  } else if (type === "settlement_updated") {
    for (const id of currentSettlements) {
      if (previousSettlements.includes(id)) {
        const before = previousSnapshot.settlements[id];
        const after = snapshot.settlements[id];
        const fieldChanges = compareObjects(before, after);
        if (fieldChanges.length > 0) {
          return {
            entityId: id,
            fieldChanges,
            beforeSnapshot: before,
            afterSnapshot: after,
          };
        }
      }
    }
  }

  return {};
}

/**
 * Extract trip metadata changes
 */
function extractTripChanges(
  snapshot: TripAutomergeDoc,
  previousSnapshot: TripAutomergeDoc,
): ChangeDetails {
  const fieldChanges = compareObjects(
    {
      name: previousSnapshot.name,
      emoji: previousSnapshot.emoji,
      currency: previousSnapshot.currency,
      startDate: previousSnapshot.startDate,
      endDate: previousSnapshot.endDate,
    },
    {
      name: snapshot.name,
      emoji: snapshot.emoji,
      currency: snapshot.currency,
      startDate: snapshot.startDate,
      endDate: snapshot.endDate,
    },
  );

  return {
    fieldChanges,
    beforeSnapshot: previousSnapshot,
    afterSnapshot: snapshot,
  };
}

/**
 * Compare two objects and return field-level changes
 *
 * @param before - Object before change
 * @param after - Object after change
 * @returns Array of field changes
 */
function compareObjects(before: any, after: any): FieldChange[] {
  const changes: FieldChange[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    // Skip metadata fields and nested objects
    if (key === "createdAt" || key === "updatedAt" || key === "splits") {
      continue;
    }

    const oldValue = before[key];
    const newValue = after[key];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        fieldPath: key,
        oldValue,
        newValue,
      });
    }
  }

  return changes;
}
