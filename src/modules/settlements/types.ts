/**
 * SETTLEMENTS MODULE - Type Definitions
 * Types for settlement transactions and related business logic
 */

/**
 * Settlement transaction (from database)
 * Represents a payment from one participant to another
 */
export interface Settlement {
  id: string;
  tripId: string;
  fromParticipantId: string;
  toParticipantId: string;
  expenseSplitId: string | null;

  // Multi-currency support
  originalCurrency: string;
  originalAmountMinor: number;
  fxRateToTrip: number | null;
  convertedAmountMinor: number;

  date: string; // ISO 8601
  description: string | null;
  paymentMethod: string | null;

  createdAt: string;
  updatedAt: string;
}

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
 * Payment methods (optional, for user reference)
 */
export type SettlementPaymentMethod =
  | "cash"
  | "venmo"
  | "paypal"
  | "bank_transfer"
  | "check"
  | "other";

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
