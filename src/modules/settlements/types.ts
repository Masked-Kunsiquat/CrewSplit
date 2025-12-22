/**
 * SETTLEMENTS MODULE - Type Definitions
 * Types for both settlement calculations (math layer) and settlement transactions (database layer)
 */

import { Settlement as DbSettlement } from "@db/schema/settlements";

// ============================================================================
// SECTION 1: PURE MATH TYPES (Settlement Engine)
// MODELER: Pure math types for balance calculation
// ============================================================================

/**
 * Participant balance for settlement calculation
 * Tracks total paid vs total owed for each participant
 */
export interface ParticipantBalance {
  participantId: string;
  participantName: string;
  netPosition: number; // Positive = owed money, Negative = owes money (in cents)
  totalPaid: number; // Total amount paid (in cents)
  totalOwed: number; // Total amount they should pay (in cents)
}

/**
 * Suggested settlement payment (pure math result from optimization algorithm)
 * This is a SUGGESTED payment, not a recorded transaction
 */
export interface SuggestedSettlement {
  from: string; // participantId
  fromName: string;
  to: string; // participantId
  toName: string;
  amount: number; // In cents
}

/**
 * Settlement summary from calculation engine
 * Includes balances, suggested payments, and expense breakdown
 */
export interface SettlementSummary {
  balances: ParticipantBalance[];
  settlements: SuggestedSettlement[];
  totalExpenses: number; // In cents (sum of all three expense types)
  currency: string;

  // Expense breakdown by type
  splitExpensesTotal: number; // In cents - expenses included in settlement calculations
  personalExpensesTotal: number; // In cents - single participant who is also payer (no debt)
  unsplitExpensesTotal: number; // In cents - expenses with zero participants (needs allocation)
  unsplitExpensesCount: number; // Count of expenses needing allocation
  unsplitExpenseIds: string[]; // IDs of expenses needing allocation
}

// ============================================================================
// SECTION 2: DISPLAY CURRENCY TYPES
// DISPLAY INTEGRATION ENGINEER: Display currency conversion
// ============================================================================

/**
 * Amount with display currency conversion
 * Used to show amounts in user's preferred currency
 */
export interface DisplayAmount {
  tripCurrency: string;
  tripAmount: number; // In cents
  displayCurrency: string;
  displayAmount: number; // In cents
  fxRate: number;
}

/**
 * Participant balance with display currency amounts
 */
export interface ParticipantBalanceWithDisplay extends ParticipantBalance {
  displayNetPosition?: DisplayAmount;
  displayTotalPaid?: DisplayAmount;
  displayTotalOwed?: DisplayAmount;
}

/**
 * Suggested settlement with display currency amount
 */
export interface SuggestedSettlementWithDisplay extends SuggestedSettlement {
  displayAmount?: DisplayAmount;
}

/**
 * Settlement summary with display currency
 */
export interface SettlementSummaryWithDisplay {
  balances: ParticipantBalanceWithDisplay[];
  settlements: SuggestedSettlementWithDisplay[];
  totalExpenses: number; // In cents (trip currency)
  currency: string; // Trip currency
  displayCurrency?: string; // User's preferred display currency
  displayTotalExpenses?: DisplayAmount;

  // Expense breakdown by type
  splitExpensesTotal?: number; // In cents
  personalExpensesTotal?: number; // In cents
  unsplitExpensesTotal?: number; // In cents
  unsplitExpensesCount?: number;
  unsplitExpenseIds?: string[]; // IDs of expenses needing allocation
}

// ============================================================================
// SECTION 3: SETTLEMENT TRANSACTION TYPES (Database Layer)
// LOCAL DATA ENGINEER: Settlement transaction records
// ============================================================================

/**
 * Settlement transaction (re-exported from database schema)
 * Represents a payment from one participant to another
 *
 * Note: This is the base type inferred from the database schema.
 * Extended types (e.g., SettlementWithParticipants) build on this.
 */
export type Settlement = Omit<DbSettlement, "paymentMethod"> & {
  paymentMethod: SettlementPaymentMethod | null;
};

/**
 * Payment methods (optional, for user reference)
 * Defined before Settlement so it can be used in the type override
 */
export type SettlementPaymentMethod =
  | "apple_pay"
  | "cash"
  | "cashapp"
  | "check"
  | "bank_transfer"
  | "venmo"
  | "paypal"
  | "zelle"
  | "other";

/**
 * New settlement data (for creation)
 */
export interface NewSettlementData {
  tripId: string;
  fromParticipantId: string;
  toParticipantId: string;
  expenseSplitId?: string;

  originalCurrency: string;
  originalAmountMinor: number;

  date: string;
  description?: string;
  paymentMethod?: SettlementPaymentMethod;
}

/**
 * Update settlement data (for editing)
 */
export interface UpdateSettlementData {
  originalCurrency?: string;
  originalAmountMinor?: number;
  date?: string;
  description?: string;
  paymentMethod?: SettlementPaymentMethod;
}

/**
 * Settlement with participant names (for display)
 */
export interface SettlementWithParticipants extends Settlement {
  fromParticipantName: string;
  toParticipantName: string;
}

/**
 * Settlement with expense details (for expense-specific settlements)
 */
export interface SettlementWithExpense extends SettlementWithParticipants {
  expenseDescription: string | null;
  expenseDate: string | null;
  expenseAmount: number | null;
}

/**
 * Settlement status for an expense split
 * Used to show how much of a split has been paid off
 */
export interface ExpenseSplitSettlementStatus {
  splitId: string;
  participantId: string;
  participantName: string;
  owedAmount: number; // Total amount owed for this split (in cents)
  settledAmount: number; // Total amount settled via settlements (in cents)
  remainingAmount: number; // Remaining debt (owedAmount - settledAmount)
  status: "unpaid" | "partial" | "paid"; // Payment status
  settlements: Settlement[]; // List of settlements linked to this split
}

/**
 * Settlement summary for a participant
 * Shows total settlements paid and received
 */
export interface ParticipantSettlementSummary {
  participantId: string;
  participantName: string;
  totalSettlementsPaid: number; // Total amount paid in settlements (in cents)
  totalSettlementsReceived: number; // Total amount received in settlements (in cents)
  netSettlements: number; // received - paid (in cents)
}

/**
 * Display currency support for settlements
 */
export interface SettlementDisplayAmount {
  tripCurrency: string;
  tripAmount: number; // In cents
  displayCurrency: string;
  displayAmount: number; // In cents
  fxRate: number;
}

export interface SettlementWithDisplay extends SettlementWithParticipants {
  displayAmount?: SettlementDisplayAmount;
}
