/**
 * SETTLEMENT MODULE - Type Definitions
 * MODELER: Pure math types
 */

export interface ParticipantBalance {
  participantId: string;
  participantName: string;
  netPosition: number; // Positive = owed money, Negative = owes money (in cents)
  totalPaid: number; // Total amount paid (in cents)
  totalOwed: number; // Total amount they should pay (in cents)
}

export interface Settlement {
  from: string; // participantId
  fromName: string;
  to: string; // participantId
  toName: string;
  amount: number; // In cents
}

export interface SettlementSummary {
  balances: ParticipantBalance[];
  settlements: Settlement[];
  totalExpenses: number; // In cents (sum of all three expense types)
  currency: string;

  // Expense breakdown by type
  splitExpensesTotal: number; // In cents - expenses included in settlement calculations
  personalExpensesTotal: number; // In cents - single participant who is also payer (no debt)
  unsplitExpensesTotal: number; // In cents - expenses with zero participants (needs allocation)
  unsplitExpensesCount: number; // Count of expenses needing allocation
  unsplitExpenseIds: string[]; // IDs of expenses needing allocation
}

/**
 * DISPLAY INTEGRATION ENGINEER: Display Currency Types
 * Types for displaying amounts in user's preferred currency
 */

export interface DisplayAmount {
  tripCurrency: string;
  tripAmount: number; // In cents
  displayCurrency: string;
  displayAmount: number; // In cents
  fxRate: number;
}

export interface ParticipantBalanceWithDisplay extends ParticipantBalance {
  displayNetPosition?: DisplayAmount;
  displayTotalPaid?: DisplayAmount;
  displayTotalOwed?: DisplayAmount;
}

export interface SettlementWithDisplay extends Settlement {
  displayAmount?: DisplayAmount;
}

export interface SettlementSummaryWithDisplay {
  balances: ParticipantBalanceWithDisplay[];
  settlements: SettlementWithDisplay[];
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
