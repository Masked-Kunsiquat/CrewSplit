/**
 * STATISTICS SERVICE
 * LOCAL DATA ENGINEER: Orchestrates repository + engine for statistics
 */

import { getParticipantsForTrip } from "@modules/participants/repository";
import {
  getExpensesWithCategories,
  getTripCurrency,
  type ExpenseWithCategory,
} from "../repository";
import { calculateCategorySpending } from "../engine/calculate-category-spending";
import { calculateParticipantSpending } from "../engine/calculate-participant-spending";
import type { TripStatistics } from "../types";
import { tripLogger } from "@utils/logger";

interface StatisticsRepository {
  getExpensesWithCategories: typeof getExpensesWithCategories;
  getTripCurrency: typeof getTripCurrency;
}

interface ParticipantRepository {
  getParticipantsForTrip: typeof getParticipantsForTrip;
}

interface StatisticsServiceDependencies {
  statisticsRepository?: StatisticsRepository;
  participantRepository?: ParticipantRepository;
}

const buildCategoryReferences = (
  expenses: ExpenseWithCategory[],
): Array<{ id: string; name: string; emoji: string | null }> => {
  const categories = new Map<string, { id: string; name: string; emoji: string | null }>();

  for (const expense of expenses) {
    if (!expense.categoryId || !expense.categoryName) continue;
    categories.set(expense.categoryId, {
      id: expense.categoryId,
      name: expense.categoryName,
      emoji: expense.categoryEmoji ?? null,
    });
  }

  return Array.from(categories.values());
};

/**
 * Compute full trip statistics summary
 * @throws Error if trip not found or database error occurs
 */
export const computeStatistics = async (
  tripId: string,
  dependencies: StatisticsServiceDependencies = {},
): Promise<TripStatistics> => {
  if (!tripId) {
    const error = new Error("Trip ID is required") as Error & { code: string };
    error.code = "TRIP_ID_REQUIRED";
    throw error;
  }

  const statisticsRepository =
    dependencies.statisticsRepository ?? {
      getExpensesWithCategories,
      getTripCurrency,
    };
  const participantRepository = dependencies.participantRepository ?? {
    getParticipantsForTrip,
  };

  try {
    tripLogger.debug("Computing statistics", { tripId });

    const [expenses, tripCurrency, participants] = await Promise.all([
      statisticsRepository.getExpensesWithCategories(tripId),
      statisticsRepository.getTripCurrency(tripId),
      participantRepository.getParticipantsForTrip(tripId),
    ]);

    const totalCost = expenses.reduce(
      (sum, expense) => sum + expense.convertedAmountMinor,
      0,
    );

    const participantSpending = calculateParticipantSpending(
      expenses,
      participants,
    );

    const categorySpending = calculateCategorySpending(
      expenses,
      buildCategoryReferences(expenses),
    );

    tripLogger.debug("Statistics computed", {
      tripId,
      expenseCount: expenses.length,
      participantCount: participants.length,
      categoryCount: categorySpending.length,
    });

    return {
      totalCost,
      currency: tripCurrency,
      participantSpending,
      categorySpending,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      (error as { code: string }).code === "TRIP_NOT_FOUND"
    ) {
      throw error;
    }

    tripLogger.error("Failed to compute statistics", { tripId, error });
    const wrapped = new Error("Failed to compute statistics") as Error & {
      code: string;
      cause?: unknown;
    };
    wrapped.code = "STATISTICS_DB_ERROR";
    wrapped.cause = error;
    throw wrapped;
  }
};

export const StatisticsService = {
  computeStatistics,
};
