/**
 * EXPENSES MODULE - Type Definitions
 */

export interface Expense {
  id: string;
  tripId: string;
  description: string;
  amount: number; // In cents to avoid floating-point errors
  currency: string;
  paidBy: string; // participantId
  category?: string;
  date: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  participantId: string;
  share: number; // Weight or percentage (will be normalized)
  shareType: 'equal' | 'percentage' | 'amount' | 'weight';
  amount?: number; // For 'amount' type splits (in cents)
}

export interface CreateExpenseInput {
  tripId: string;
  description: string;
  amount: number;
  paidBy: string;
  category?: string;
  date?: string;
  splits: Array<{
    participantId: string;
    share: number;
    shareType: 'equal' | 'percentage' | 'amount' | 'weight';
    amount?: number;
  }>;
}

export interface UpdateExpenseInput {
  description?: string;
  amount?: number;
  paidBy?: string;
  category?: string;
  date?: string;
  splits?: Array<{
    participantId: string;
    share: number;
    shareType: 'equal' | 'percentage' | 'amount' | 'weight';
    amount?: number;
  }>;
}
