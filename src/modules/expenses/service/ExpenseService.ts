/**
 * SETTLEMENT INTEGRATION ENGINEER: Expense Service Layer
 *
 * Service layer for expense operations that orchestrates between:
 * - Pure engine functions (currency conversion)
 * - Repository layer (database operations)
 * - Cross-module dependencies (trip repository)
 *
 * This layer handles:
 * - Loading trip currency for conversion
 * - Coordinating conversion calculations
 * - Orchestrating multi-step operations
 *
 * Uses dependency injection for testability.
 */

import { computeConversion } from "../engine";
import type { Expense, CreateExpenseInput, UpdateExpenseInput } from "../types";
import { expenseLogger } from "@utils/logger";
import * as Crypto from "expo-crypto";
import { createNotFoundError, createAppError } from "@utils/errors";

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

/**
 * Creates a new expense with currency conversion and validation.
 *
 * @param data - Expense creation input
 * @param deps - Injected dependencies (for testing)
 * @returns Created expense
 *
 * @throws {Error} TRIP_NOT_FOUND - Trip does not exist
 * @throws {Error} CATEGORY_NOT_FOUND - Category does not exist
 * @throws {Error} FX_RATE_REQUIRED - Currency conversion requires rate
 * @throws {Error} FX_RATE_INVALID - Invalid exchange rate provided
 */
export async function createExpense(
  data: CreateExpenseInput,
  deps: ExpenseServiceDependencies = {},
): Promise<Expense> {
  const { expenseRepository, tripRepository, categoryRepository } = deps;

  if (!expenseRepository) {
    throw createAppError(
      "MISSING_DEPENDENCY",
      "expenseRepository dependency is required",
    );
  }
  if (!tripRepository) {
    throw createAppError(
      "MISSING_DEPENDENCY",
      "tripRepository dependency is required",
    );
  }
  if (!categoryRepository) {
    throw createAppError(
      "MISSING_DEPENDENCY",
      "categoryRepository dependency is required",
    );
  }

  // Load trip to get currency
  const trip = await tripRepository.getById(data.tripId);
  if (!trip) {
    expenseLogger.error("Trip not found", { tripId: data.tripId });
    throw createNotFoundError("TRIP_NOT_FOUND", "Trip", data.tripId);
  }

  // Validate category exists
  const categoryId = data.categoryId ?? "cat-other";
  const categoryExists = await categoryRepository.exists(categoryId);
  if (!categoryExists) {
    expenseLogger.error("Invalid category ID", { categoryId });
    throw createNotFoundError("CATEGORY_NOT_FOUND", "Category", categoryId);
  }

  // Compute conversion using pure function
  const conversion = computeConversion({
    originalAmountMinor: data.originalAmountMinor,
    originalCurrency: data.originalCurrency,
    tripCurrencyCode: trip.currencyCode,
    providedRate: data.fxRateToTrip ?? undefined,
    providedConverted: data.convertedAmountMinor,
  });

  expenseLogger.debug("Creating expense via service", {
    tripId: data.tripId,
    originalAmount: data.originalAmountMinor,
    originalCurrency: data.originalCurrency,
    tripCurrency: trip.currencyCode,
    convertedAmount: conversion.convertedAmountMinor,
    fxRate: conversion.fxRateToTrip,
  });

  const now = new Date().toISOString();
  const expenseId = Crypto.randomUUID();

  // Normalize notes
  const notes = normalizeNotes(data.notes);

  // Normalize split amounts if provided
  const normalizedSplits = data.splits.map((split) => ({
    participantId: split.participantId,
    share: split.share,
    shareType: split.shareType,
    amount: normalizeSplitAmount(split.amount, conversion.fxRateToTrip),
  }));

  // Call repository with computed data
  return expenseRepository.create({
    id: expenseId,
    tripId: data.tripId,
    description: data.description,
    notes,
    amount: conversion.convertedAmountMinor,
    currency: trip.currencyCode,
    originalCurrency: data.originalCurrency,
    originalAmountMinor: data.originalAmountMinor,
    fxRateToTrip: conversion.fxRateToTrip,
    convertedAmountMinor: conversion.convertedAmountMinor,
    paidBy: data.paidBy,
    categoryId,
    date: data.date ?? now,
    splits: normalizedSplits,
  });
}

/**
 * Updates an existing expense with currency conversion and validation.
 *
 * @param expenseId - ID of expense to update
 * @param patch - Partial expense update data
 * @param deps - Injected dependencies (for testing)
 * @returns Updated expense
 *
 * @throws {Error} EXPENSE_NOT_FOUND - Expense does not exist
 * @throws {Error} TRIP_NOT_FOUND - Trip does not exist
 * @throws {Error} CATEGORY_NOT_FOUND - Category does not exist (if updating category)
 * @throws {Error} FX_RATE_REQUIRED - Currency conversion requires rate
 * @throws {Error} FX_RATE_INVALID - Invalid exchange rate provided
 */
export async function updateExpense(
  expenseId: string,
  patch: UpdateExpenseInput,
  deps: ExpenseServiceDependencies = {},
): Promise<Expense> {
  const { expenseRepository, tripRepository, categoryRepository } = deps;

  if (!expenseRepository) {
    throw createAppError(
      "MISSING_DEPENDENCY",
      "expenseRepository dependency is required",
    );
  }
  if (!tripRepository) {
    throw createAppError(
      "MISSING_DEPENDENCY",
      "tripRepository dependency is required",
    );
  }
  if (!categoryRepository) {
    throw createAppError(
      "MISSING_DEPENDENCY",
      "categoryRepository dependency is required",
    );
  }

  // Load existing expense
  const existing = await expenseRepository.getById(expenseId);
  if (!existing) {
    expenseLogger.error("Expense not found on update", { expenseId });
    throw createNotFoundError("EXPENSE_NOT_FOUND", "Expense", expenseId);
  }

  // Load trip to get currency
  const trip = await tripRepository.getById(existing.tripId);
  if (!trip) {
    expenseLogger.error("Trip not found", { tripId: existing.tripId });
    throw createNotFoundError("TRIP_NOT_FOUND", "Trip", existing.tripId);
  }

  // Validate category if being updated
  if (patch.categoryId !== undefined) {
    const categoryExists = await categoryRepository.exists(patch.categoryId);
    if (!categoryExists) {
      expenseLogger.error("Invalid category ID", {
        categoryId: patch.categoryId,
      });
      throw createNotFoundError(
        "CATEGORY_NOT_FOUND",
        "Category",
        patch.categoryId,
      );
    }
  }

  // Compute conversion with merged data
  const originalCurrency = patch.originalCurrency ?? existing.originalCurrency;
  const originalAmountMinor =
    patch.originalAmountMinor ?? existing.originalAmountMinor;
  const conversion = computeConversion({
    originalAmountMinor,
    originalCurrency,
    tripCurrencyCode: trip.currencyCode,
    providedRate: patch.fxRateToTrip ?? existing.fxRateToTrip ?? undefined,
    providedConverted:
      patch.convertedAmountMinor ?? existing.convertedAmountMinor,
  });

  expenseLogger.debug("Updating expense via service", {
    expenseId,
    tripId: existing.tripId,
    convertedAmount: conversion.convertedAmountMinor,
    fxRate: conversion.fxRateToTrip,
  });

  // Normalize notes if provided
  const normalizedNotes =
    patch.notes !== undefined ? normalizeNotes(patch.notes) : undefined;

  // Normalize split amounts if provided
  const normalizedSplits = patch.splits?.map((split) => ({
    participantId: split.participantId,
    share: split.share,
    shareType: split.shareType,
    amount: normalizeSplitAmount(split.amount, conversion.fxRateToTrip),
  }));

  // Build update payload
  const updateData: Parameters<IExpenseRepository["update"]>[1] = {
    description: patch.description,
    notes: normalizedNotes,
    amount: conversion.convertedAmountMinor,
    currency: trip.currencyCode,
    originalCurrency,
    originalAmountMinor,
    fxRateToTrip: conversion.fxRateToTrip,
    convertedAmountMinor: conversion.convertedAmountMinor,
    paidBy: patch.paidBy,
    categoryId: patch.categoryId,
    date: patch.date,
    splits: normalizedSplits,
  };

  // Remove undefined values to avoid overwriting with undefined
  Object.keys(updateData).forEach((key) => {
    if (updateData[key as keyof typeof updateData] === undefined) {
      delete updateData[key as keyof typeof updateData];
    }
  });

  return expenseRepository.update(expenseId, updateData);
}

/**
 * Deletes an expense and all associated splits.
 *
 * @param expenseId - ID of expense to delete
 * @param deps - Injected dependencies (for testing)
 *
 * @throws {Error} EXPENSE_NOT_FOUND - Expense does not exist
 */
export async function deleteExpense(
  expenseId: string,
  deps: ExpenseServiceDependencies = {},
): Promise<void> {
  const { expenseRepository } = deps;

  if (!expenseRepository) {
    throw createAppError(
      "MISSING_DEPENDENCY",
      "expenseRepository dependency is required",
    );
  }

  // Check if expense exists before attempting deletion
  const existing = await expenseRepository.getById(expenseId);
  if (!existing) {
    expenseLogger.error("Expense not found on delete", { expenseId });
    throw createNotFoundError("EXPENSE_NOT_FOUND", "Expense", expenseId);
  }

  expenseLogger.debug("Deleting expense via service", { expenseId });

  await expenseRepository.delete(expenseId);

  expenseLogger.info("Expense deleted", { expenseId });
}

/**
 * Normalizes notes field: trims whitespace, converts empty to null
 */
function normalizeNotes(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Normalizes split amounts with FX conversion if needed
 */
function normalizeSplitAmount(
  amount: number | undefined | null,
  fxRateToTrip: number | null,
): number | null {
  if (amount === undefined || amount === null) return null;
  if (!fxRateToTrip || fxRateToTrip === 1) return amount;
  return Math.round(amount * fxRateToTrip);
}
