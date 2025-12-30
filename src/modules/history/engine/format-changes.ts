/**
 * HISTORY MODULE - Format Changes Engine
 * MODELER: Pure functions for formatting parsed changes into UI-friendly descriptions
 * PURE FUNCTIONS: No side effects, converts ParsedChange into human-readable strings
 *
 * This module takes parsed Automerge changes and formats them into
 * human-readable descriptions suitable for display in the timeline UI.
 */

import type {
  ParsedChange,
  ChangeType,
  FieldChange,
} from "../../automerge/engine/history-parser";
import type {
  TripParticipant,
  TripExpense,
  TripSettlement,
} from "../../automerge/types";
import { formatCurrency } from "@utils/currency";

/**
 * Formatted change for UI display
 */
export interface FormattedChange {
  /** Unique ID (using timestamp + actor as key) */
  id: string;
  /** Type of change */
  type: ChangeType;
  /** ISO timestamp */
  timestamp: string;
  /** Human-readable title (one-line summary) */
  title: string;
  /** Detailed description (optional, for expanded view) */
  description: string | null;
  /** Icon/emoji representing the change type */
  icon: string;
  /** Color accent for the timeline dot */
  color: string;
  /** Field-level changes (for expanded detail view) */
  fieldChanges?: FormattedFieldChange[];
}

/**
 * Formatted field change for detail card
 */
export interface FormattedFieldChange {
  label: string;
  oldValue: string;
  newValue: string;
}

/**
 * Format parsed changes into UI-friendly display objects
 *
 * @param changes - Array of parsed changes from history-parser
 * @param participants - Map of participant IDs to participant objects (for name lookup)
 * @returns Array of formatted changes ready for UI display
 *
 * @example
 * const formattedChanges = formatChanges(parsedChanges, participantsMap);
 * // formattedChanges[0] = {
 * //   id: '...',
 * //   title: 'Added Alice to the trip',
 * //   icon: '👤',
 * //   color: '#4CAF50',
 * //   ...
 * // }
 */
export function formatChanges(
  changes: ParsedChange[],
  participants: Map<string, TripParticipant>,
): FormattedChange[] {
  return changes.map((change) => formatChange(change, participants));
}

/**
 * Format a single parsed change
 *
 * @param change - Parsed change from Automerge
 * @param participants - Map of participant IDs to objects
 * @returns Formatted change for UI
 */
function formatChange(
  change: ParsedChange,
  participants: Map<string, TripParticipant>,
): FormattedChange {
  const id = `${change.timestamp}-${change.actorId}`;
  const { type, timestamp, details } = change;

  let title = "";
  let description: string | null = null;
  let icon = "";
  let color = "";
  let fieldChanges: FormattedFieldChange[] | undefined;

  switch (type) {
    case "trip_created":
      title = "Trip created";
      description = "Initial trip setup";
      icon = "✨";
      color = "#9C27B0"; // Purple
      break;

    case "trip_updated":
      title = "Trip details updated";
      description = formatTripUpdateDescription(details.fieldChanges || []);
      icon = "✏️";
      color = "#2196F3"; // Blue
      fieldChanges = formatFieldChanges(details.fieldChanges || []);
      break;

    case "participant_added": {
      const participant = details.afterSnapshot as TripParticipant | undefined;
      title = participant ? `Added ${participant.name}` : "Added participant";
      description = "New participant joined the trip";
      icon = "👤";
      color = "#4CAF50"; // Green
      break;
    }

    case "participant_updated": {
      const participant = details.afterSnapshot as TripParticipant | undefined;
      title = participant
        ? `Updated ${participant.name}`
        : "Updated participant";
      description = formatParticipantUpdateDescription(
        details.fieldChanges || [],
      );
      icon = "✏️";
      color = "#2196F3"; // Blue
      fieldChanges = formatFieldChanges(details.fieldChanges || []);
      break;
    }

    case "participant_removed": {
      const participant = details.beforeSnapshot as TripParticipant | undefined;
      title = participant
        ? `Removed ${participant.name}`
        : "Removed participant";
      description = "Participant left the trip";
      icon = "👋";
      color = "#F44336"; // Red
      break;
    }

    case "expense_added": {
      const expense = details.afterSnapshot as TripExpense | undefined;
      if (expense) {
        const payer = participants.get(expense.paidById);
        const payerName = payer ? payer.name : "Unknown";
        const amount = formatCurrency(
          expense.convertedAmountMinor,
          expense.originalCurrency,
        );
        title = `${payerName} paid ${amount}`;
        description = expense.description || "No description";
      } else {
        title = "Added expense";
        description = null;
      }
      icon = "💰";
      color = "#FF9800"; // Orange
      break;
    }

    case "expense_updated": {
      const expense = details.afterSnapshot as TripExpense | undefined;
      if (expense) {
        title = `Updated expense: ${expense.description || "Untitled"}`;
        description = formatExpenseUpdateDescription(
          details.fieldChanges || [],
          participants,
        );
      } else {
        title = "Updated expense";
        description = null;
      }
      icon = "✏️";
      color = "#2196F3"; // Blue
      fieldChanges = formatFieldChanges(
        details.fieldChanges || [],
        participants,
      );
      break;
    }

    case "expense_removed": {
      const expense = details.beforeSnapshot as TripExpense | undefined;
      title = expense?.description
        ? `Removed expense: ${expense.description}`
        : "Removed expense";
      description = null;
      icon = "🗑️";
      color = "#F44336"; // Red
      break;
    }

    case "settlement_added": {
      const settlement = details.afterSnapshot as TripSettlement | undefined;
      if (settlement) {
        const from = participants.get(settlement.fromParticipantId);
        const to = participants.get(settlement.toParticipantId);
        const fromName = from ? from.name : "Unknown";
        const toName = to ? to.name : "Unknown";
        const amount = formatCurrency(
          settlement.convertedAmountMinor,
          settlement.originalCurrency,
        );
        title = `${fromName} paid ${toName} ${amount}`;
        description = settlement.description || "Payment recorded";
      } else {
        title = "Recorded payment";
        description = null;
      }
      icon = "💸";
      color = "#4CAF50"; // Green
      break;
    }

    case "settlement_updated": {
      const settlement = details.afterSnapshot as TripSettlement | undefined;
      title = settlement?.description
        ? `Updated payment: ${settlement.description}`
        : "Updated payment";
      description = formatSettlementUpdateDescription(
        details.fieldChanges || [],
        participants,
      );
      icon = "✏️";
      color = "#2196F3"; // Blue
      fieldChanges = formatFieldChanges(
        details.fieldChanges || [],
        participants,
      );
      break;
    }

    case "settlement_removed": {
      const settlement = details.beforeSnapshot as TripSettlement | undefined;
      title = settlement?.description
        ? `Removed payment: ${settlement.description}`
        : "Removed payment";
      description = null;
      icon = "🗑️";
      color = "#F44336"; // Red
      break;
    }

    default:
      title = change.message || "Unknown change";
      description = null;
      icon = "❓";
      color = "#9E9E9E"; // Gray
      break;
  }

  return {
    id,
    type,
    timestamp,
    title,
    description,
    icon,
    color,
    fieldChanges,
  };
}

/**
 * Format trip update description
 */
function formatTripUpdateDescription(fieldChanges: FieldChange[]): string {
  const descriptions = fieldChanges.map((change) => {
    switch (change.fieldPath) {
      case "name":
        return `Renamed to "${change.newValue}"`;
      case "emoji":
        return `Changed emoji to ${change.newValue}`;
      case "currency":
        return `Changed currency to ${change.newValue}`;
      case "startDate":
        return `Changed start date to ${formatDate(change.newValue as string)}`;
      case "endDate":
        return change.newValue
          ? `Changed end date to ${formatDate(change.newValue as string)}`
          : "Removed end date";
      default:
        return `Updated ${change.fieldPath}`;
    }
  });

  return descriptions.join(", ");
}

/**
 * Format participant update description
 */
function formatParticipantUpdateDescription(
  fieldChanges: FieldChange[],
): string {
  const descriptions = fieldChanges.map((change) => {
    switch (change.fieldPath) {
      case "name":
        return `Renamed to "${change.newValue}"`;
      case "color":
        return `Changed color`;
      default:
        return `Updated ${change.fieldPath}`;
    }
  });

  return descriptions.join(", ");
}

/**
 * Format expense update description
 */
function formatExpenseUpdateDescription(
  fieldChanges: FieldChange[],
  participants: Map<string, TripParticipant>,
): string {
  const descriptions = fieldChanges.map((change) => {
    switch (change.fieldPath) {
      case "description":
        return `Renamed to "${change.newValue}"`;
      case "convertedAmountMinor":
      case "originalAmountMinor": {
        const oldAmount = formatCurrency(change.oldValue as number, "USD");
        const newAmount = formatCurrency(change.newValue as number, "USD");
        return `Amount changed from ${oldAmount} to ${newAmount}`;
      }
      case "paidById": {
        const oldPayer = participants.get(change.oldValue as string);
        const newPayer = participants.get(change.newValue as string);
        const oldName = oldPayer ? oldPayer.name : "Unknown";
        const newName = newPayer ? newPayer.name : "Unknown";
        return `Payer changed from ${oldName} to ${newName}`;
      }
      case "date":
        return `Date changed to ${formatDate(change.newValue as string)}`;
      default:
        return `Updated ${change.fieldPath}`;
    }
  });

  return descriptions.join(", ");
}

/**
 * Format settlement update description
 */
function formatSettlementUpdateDescription(
  fieldChanges: FieldChange[],
  participants: Map<string, TripParticipant>,
): string {
  const descriptions = fieldChanges.map((change) => {
    switch (change.fieldPath) {
      case "convertedAmountMinor":
      case "originalAmountMinor": {
        const oldAmount = formatCurrency(change.oldValue as number, "USD");
        const newAmount = formatCurrency(change.newValue as number, "USD");
        return `Amount changed from ${oldAmount} to ${newAmount}`;
      }
      case "fromParticipantId": {
        const oldPayer = participants.get(change.oldValue as string);
        const newPayer = participants.get(change.newValue as string);
        const oldName = oldPayer ? oldPayer.name : "Unknown";
        const newName = newPayer ? newPayer.name : "Unknown";
        return `Payer changed from ${oldName} to ${newName}`;
      }
      case "toParticipantId": {
        const oldPayee = participants.get(change.oldValue as string);
        const newPayee = participants.get(change.newValue as string);
        const oldName = oldPayee ? oldPayee.name : "Unknown";
        const newName = newPayee ? newPayee.name : "Unknown";
        return `Recipient changed from ${oldName} to ${newName}`;
      }
      case "description":
        return `Description changed to "${change.newValue}"`;
      case "date":
        return `Date changed to ${formatDate(change.newValue as string)}`;
      default:
        return `Updated ${change.fieldPath}`;
    }
  });

  return descriptions.join(", ");
}

/**
 * Format field changes for detail card
 */
function formatFieldChanges(
  fieldChanges: FieldChange[],
  participants?: Map<string, TripParticipant>,
): FormattedFieldChange[] {
  return fieldChanges.map((change) => {
    const label = formatFieldLabel(change.fieldPath);
    const oldValue = formatFieldValue(
      change.fieldPath,
      change.oldValue,
      participants,
    );
    const newValue = formatFieldValue(
      change.fieldPath,
      change.newValue,
      participants,
    );

    return { label, oldValue, newValue };
  });
}

/**
 * Format field label for display
 */
function formatFieldLabel(fieldPath: string): string {
  switch (fieldPath) {
    case "name":
      return "Name";
    case "emoji":
      return "Emoji";
    case "currency":
      return "Currency";
    case "startDate":
      return "Start Date";
    case "endDate":
      return "End Date";
    case "description":
      return "Description";
    case "originalAmountMinor":
    case "convertedAmountMinor":
      return "Amount";
    case "paidById":
      return "Paid By";
    case "fromParticipantId":
      return "From";
    case "toParticipantId":
      return "To";
    case "date":
      return "Date";
    case "color":
      return "Color";
    default:
      return fieldPath;
  }
}

/**
 * Format field value for display
 */
function formatFieldValue(
  fieldPath: string,
  value: unknown,
  participants?: Map<string, TripParticipant>,
): string {
  if (value === null || value === undefined) {
    return "(none)";
  }

  switch (fieldPath) {
    case "originalAmountMinor":
    case "convertedAmountMinor":
      return formatCurrency(value as number, "USD");
    case "paidById":
    case "fromParticipantId":
    case "toParticipantId": {
      if (!participants) return String(value);
      const participant = participants.get(value as string);
      return participant ? participant.name : String(value);
    }
    case "startDate":
    case "endDate":
    case "date":
      return formatDate(value as string);
    default:
      return String(value);
  }
}

/**
 * Format ISO date string for display
 */
function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(isoString);
  }
}
