/**
 * ONBOARDING - Sample Data Hook
 * UI/UX ENGINEER: Manage sample trip data (load, archive, restore)
 */

import { useState, useCallback } from "react";
import { onboardingRepository } from "../repository/OnboardingRepository";
import { sampleDataService } from "../services/SampleDataService";
import type { SampleDataTemplateId } from "../types";

/**
 * Hook for managing sample trip data
 *
 * Provides:
 * - loadSampleTrip: Import sample data from template
 * - archiveSampleTrips: Soft-delete all sample trips
 * - restoreSampleTrips: Un-archive sample trips
 * - deleteSampleTrips: Permanently remove sample data
 * - hasSampleData: Check if samples exist
 *
 * @example
 * const { loadSampleTrip, loading } = useSampleData();
 *
 * const tripId = await loadSampleTrip('summer_road_trip');
 * router.push(`/trips/${tripId}`);
 */
export function useSampleData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadSampleTrip = useCallback(
    async (templateId: SampleDataTemplateId): Promise<string> => {
      try {
        setLoading(true);
        setError(null);
        const tripId = await sampleDataService.loadSampleTrip(templateId);
        return tripId;
      } catch (err) {
        console.error(`Failed to load sample trip: ${templateId}`, err);
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const archiveSampleTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await onboardingRepository.archiveSampleTrips();
    } catch (err) {
      console.error("Failed to archive sample trips:", err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const restoreSampleTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await onboardingRepository.restoreSampleTrips();
    } catch (err) {
      console.error("Failed to restore sample trips:", err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSampleTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await onboardingRepository.deleteSampleTrips();
    } catch (err) {
      console.error("Failed to delete sample trips:", err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const hasSampleData = useCallback(async (): Promise<boolean> => {
    try {
      return await onboardingRepository.hasSampleData();
    } catch (err) {
      console.error("Failed to check for sample data:", err);
      return false;
    }
  }, []);

  const hasActiveSampleData = useCallback(async (): Promise<boolean> => {
    try {
      return await onboardingRepository.hasActiveSampleData();
    } catch (err) {
      console.error("Failed to check for active sample data:", err);
      return false;
    }
  }, []);

  return {
    loading,
    error,
    loadSampleTrip,
    archiveSampleTrips,
    restoreSampleTrips,
    deleteSampleTrips,
    hasSampleData,
    hasActiveSampleData,
  };
}

/**
 * Hook for reloading sample data from scratch
 * Deletes existing samples and reimports from JSON
 *
 * Use for "Restore Sample Trips" button in Settings
 *
 * @example
 * const { reloadSampleData, loading } = useReloadSampleData();
 * await reloadSampleData('summer_road_trip');
 */
export function useReloadSampleData() {
  const { deleteSampleTrips, loadSampleTrip } = useSampleData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reloadSampleData = useCallback(
    async (templateId: SampleDataTemplateId): Promise<string> => {
      try {
        setLoading(true);
        setError(null);

        // Delete existing sample data (hard delete)
        await deleteSampleTrips();

        // Load fresh copy from template
        const tripId = await loadSampleTrip(templateId);

        return tripId;
      } catch (err) {
        console.error(`Failed to reload sample data: ${templateId}`, err);
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [deleteSampleTrips, loadSampleTrip],
  );

  return {
    loading,
    error,
    reloadSampleData,
  };
}
