/**
 * EXPENSES MODULE - Type Definitions
 */

export interface ExpenseCategory {
  id: string;
  name: string;
  emoji: string;
  tripId?: string | null; // NULL = global, otherwise trip-specific
  isSystem: boolean;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseCategoryInput {
  name: string;
  emoji: string;
  tripId?: string | null; // NULL = global category
  sortOrder?: number;
}

export interface Expense {
  id: string;
  tripId: string;
  description: string;
  amount: number; // Derived: equals convertedAmountMinor (trip currency)
  currency: string; // Trip currency code (legacy column)
  originalCurrency: string;
  originalAmountMinor: number; // In original currency's minor units
  fxRateToTrip?: number | null; // Null/undefined when currencies match
  convertedAmountMinor: number; // Always in trip currency minor units
  paidBy: string; // participantId
  categoryId?: string; // FK to expense_categories
  category?: string; // DEPRECATED: Legacy text field
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
  amount?: number; // For 'amount' type splits (in trip currency minor units)
}

export interface CreateExpenseInput {
  tripId: string;
  description: string;
  originalAmountMinor: number;
  originalCurrency: string;
  fxRateToTrip?: number | null;
  paidBy: string;
  categoryId?: string;
  category?: never; // Prevent usage in new code
  date?: string;
  convertedAmountMinor?: number;
  splits: Array<{
    participantId: string;
    share: number;
    shareType: 'equal' | 'percentage' | 'amount' | 'weight';
    amount?: number;
  }>;
}

export interface UpdateExpenseInput {
  description?: string;
  originalAmountMinor?: number;
  originalCurrency?: string;
  fxRateToTrip?: number | null;
  convertedAmountMinor?: number;
  paidBy?: string;
  categoryId?: string;
  category?: never; // Prevent usage in new code
  date?: string;
  splits?: Array<{
    participantId: string;
    share: number;
    shareType: 'equal' | 'percentage' | 'amount' | 'weight';
    amount?: number;
  }>;
}
