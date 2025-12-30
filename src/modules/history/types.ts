/**
 * HISTORY MODULE - Type Definitions
 * Domain types for trip history feature
 */

// Re-export engine types
export type {
  FormattedChange,
  FormattedFieldChange,
} from "./engine/format-changes";

export type {
  ParsedChange,
  ChangeType,
  ChangeDetails,
  FieldChange,
} from "../automerge/engine/history-parser";
