/**
 * EXPENSES MODULE
 * Manages expense creation, editing, and tracking
 * SYSTEM ARCHITECT: Core domain entity
 */

export * from "./types";
export * from "./hooks";

// Query functions (read-only) are exported for cross-module use
// Mutations should use hooks/service layer
export {
  getExpensesForTrip,
  getExpenseById,
  getExpenseSplits,
} from "./repository";
