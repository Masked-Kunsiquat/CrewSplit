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
  totalExpenses: number; // In cents
  currency: string;
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
}
