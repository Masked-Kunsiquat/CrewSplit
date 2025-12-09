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
