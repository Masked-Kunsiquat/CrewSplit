/**
 * Service Layer Type Definitions
 *
 * These interfaces define contracts for dependency injection,
 * allowing the service layer to depend on abstractions rather than concrete implementations.
 */

import type { Expense } from "../types";

/**
 * Repository interface for expense CRUD operations
 */
export interface IExpenseRepository {
  create(data: {
    id: string;
    tripId: string;
    description: string;
    notes: string | null;
    amount: number;
    currency: string;
    originalCurrency: string;
    originalAmountMinor: number;
    fxRateToTrip: number | null;
    convertedAmountMinor: number;
    paidBy: string;
    categoryId: string;
    date: string;
    splits: {
      participantId: string;
      share: number;
      shareType: "equal" | "percentage" | "amount" | "weight";
      amount: number | null;
    }[];
  }): Promise<Expense>;

  update(
    id: string,
    data: {
      description?: string;
      notes?: string | null;
      amount?: number;
      currency?: string;
      originalCurrency?: string;
      originalAmountMinor?: number;
      fxRateToTrip?: number | null;
      convertedAmountMinor?: number;
      paidBy?: string;
      categoryId?: string;
      date?: string;
      splits?: {
        participantId: string;
        share: number;
        shareType: "equal" | "percentage" | "amount" | "weight";
        amount: number | null;
      }[];
    },
  ): Promise<Expense>;

  delete(id: string): Promise<void>;

  getById(id: string): Promise<Expense | null>;
}

/**
 * Repository interface for trip operations
 */
export interface ITripRepository {
  getById(id: string): Promise<{ id: string; currencyCode: string } | null>;
}

/**
 * Category repository interface
 */
export interface ICategoryRepository {
  exists(id: string): Promise<boolean>;
}

/**
 * Dependencies for ExpenseService
 */
export interface ExpenseServiceDependencies {
  expenseRepository?: IExpenseRepository;
  tripRepository?: ITripRepository;
  categoryRepository?: ICategoryRepository;
}
