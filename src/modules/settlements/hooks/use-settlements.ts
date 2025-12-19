/**
 * SETTLEMENTS HOOKS
 * React hooks for accessing settlement data with proper state management
 */

import { useState, useCallback } from "react";
import { useQuery } from "../../../hooks";
import { SettlementRepository } from "../repository";
import type {
  SettlementWithParticipants,
  NewSettlementData,
  UpdateSettlementData,
} from "../types";

/**
 * Hook to fetch all settlements for a trip
 * @param tripId - Trip UUID (nullable)
 * @returns Object with settlements array, loading state, error, and refetch function
 */
export function useSettlements(tripId: string | null) {
  const {
    data: settlements,
    loading,
    error,
    refetch,
  } = useQuery(
    () =>
      tripId
        ? SettlementRepository.getSettlementsForTrip(tripId)
        : Promise.resolve<SettlementWithParticipants[]>([]),
    [tripId],
    [],
    "Failed to load settlements",
    true, // Enable refetch on focus to reflect create/edit changes
  );

  return { settlements, loading, error, refetch };
}

/**
 * Hook to fetch a single settlement by ID
 * @param settlementId - Settlement UUID
 * @returns Object with settlement, loading state, error, and refetch function
 */
export function useSettlement(settlementId: string | null) {
  const {
    data: settlement,
    loading,
    error,
    refetch,
  } = useQuery(
    () =>
      settlementId
        ? SettlementRepository.getSettlementById(settlementId)
        : Promise.resolve(null),
    [settlementId],
    null,
    "Failed to load settlement",
  );

  return { settlement, loading, error, refetch };
}

/**
 * Hook to fetch settlements for a specific expense
 * @param expenseId - Expense UUID
 * @returns Object with settlements array, loading state, error, and refetch function
 */
export function useSettlementsForExpense(expenseId: string | null) {
  const {
    data: settlements,
    loading,
    error,
    refetch,
  } = useQuery(
    () =>
      expenseId
        ? SettlementRepository.getSettlementsForExpense(expenseId)
        : Promise.resolve<SettlementWithParticipants[]>([]),
    [expenseId],
    [],
    "Failed to load settlements for expense",
  );

  return { settlements, loading, error, refetch };
}

/**
 * Hook to create a settlement
 * @returns Object with createSettlement function, loading state, and error
 */
export function useCreateSettlement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createSettlement = useCallback(
    async (data: NewSettlementData): Promise<SettlementWithParticipants> => {
      setLoading(true);
      setError(null);

      try {
        const settlement = await SettlementRepository.createSettlement(data);
        setLoading(false);
        return settlement;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        setLoading(false);
        throw error;
      }
    },
    [],
  );

  return { createSettlement, loading, error };
}

/**
 * Hook to update a settlement
 * @returns Object with updateSettlement function, loading state, and error
 */
export function useUpdateSettlement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateSettlement = useCallback(
    async (
      id: string,
      data: UpdateSettlementData,
    ): Promise<SettlementWithParticipants> => {
      setLoading(true);
      setError(null);

      try {
        const settlement = await SettlementRepository.updateSettlement(
          id,
          data,
        );
        setLoading(false);
        return settlement;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        setLoading(false);
        throw error;
      }
    },
    [],
  );

  return { updateSettlement, loading, error };
}

/**
 * Hook to delete a settlement
 * @returns Object with deleteSettlement function, loading state, and error
 */
export function useDeleteSettlement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteSettlement = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await SettlementRepository.deleteSettlement(id);
      setLoading(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      setLoading(false);
      throw error;
    }
  }, []);

  return { deleteSettlement, loading, error };
}
