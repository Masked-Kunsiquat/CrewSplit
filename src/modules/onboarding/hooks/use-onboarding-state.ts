/**
 * ONBOARDING - Onboarding State Hook
 * UI/UX ENGINEER: Check and manage onboarding completion status
 */

import { useState, useEffect, useCallback } from "react";
import { onboardingRepository } from "../repository/OnboardingRepository";
import type { OnboardingFlowId, OnboardingStepId } from "../types";

/**
 * Hook for managing onboarding state
 *
 * Provides:
 * - isComplete: Whether initial onboarding is done
 * - loading: Initial load state
 * - markComplete: Mark onboarding as complete
 * - markStep: Mark individual step complete
 * - reset: Reset onboarding (for testing)
 *
 * @example
 * const { isComplete, loading, markComplete } = useOnboardingState();
 *
 * if (loading) return <LoadingScreen />;
 * if (!isComplete) return <Redirect href="/onboarding/welcome" />;
 */
export function useOnboardingState(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Check onboarding status when enabled
  useEffect(() => {
    if (!enabled) {
      return;
    }
    checkStatus();
  }, [enabled]);

  const checkStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const completed =
        await onboardingRepository.isInitialOnboardingCompleted();
      setIsComplete(completed);
    } catch (err) {
      console.error("Failed to check onboarding status:", err);
      setError(err as Error);
      setIsComplete(false); // Default to not complete on error
    } finally {
      setLoading(false);
    }
  };

  const markComplete = useCallback(async () => {
    try {
      setError(null);
      await onboardingRepository.markFlowCompleted("initial_onboarding");
      setIsComplete(true);
    } catch (err) {
      console.error("Failed to mark onboarding complete:", err);
      setError(err as Error);
      throw err;
    }
  }, []);

  const markStep = useCallback(async (stepId: OnboardingStepId) => {
    try {
      setError(null);
      await onboardingRepository.markStepCompleted(
        "initial_onboarding",
        stepId,
      );
    } catch (err) {
      console.error(`Failed to mark step complete: ${stepId}`, err);
      setError(err as Error);
      throw err;
    }
  }, []);

  const reset = useCallback(async () => {
    try {
      setError(null);
      await onboardingRepository.resetOnboardingFlow("initial_onboarding");
      setIsComplete(false);
    } catch (err) {
      console.error("Failed to reset onboarding:", err);
      setError(err as Error);
      throw err;
    }
  }, []);

  return {
    isComplete,
    loading,
    error,
    markComplete,
    markStep,
    reset,
    refresh: checkStatus,
  };
}

/**
 * Hook for managing a specific onboarding flow
 * More generic than useOnboardingState, allows tracking any flow
 *
 * @param flowId - Flow identifier
 *
 * @example
 * const tour = useOnboardingFlow('tour_mode');
 * if (!tour.isComplete) {
 *   // Show tour
 * }
 */
export function useOnboardingFlow(flowId: OnboardingFlowId) {
  const [state, setState] = useState<{
    isComplete: boolean;
    completedSteps: OnboardingStepId[];
    loading: boolean;
    error: Error | null;
  }>({
    isComplete: false,
    completedSteps: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    loadFlow();
  }, [flowId]);

  const loadFlow = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const flowState = await onboardingRepository.getOnboardingState(flowId);
      setState({
        isComplete: flowState?.isCompleted ?? false,
        completedSteps: flowState?.completedSteps ?? [],
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error(`Failed to load flow: ${flowId}`, err);
      setState({
        isComplete: false,
        completedSteps: [],
        loading: false,
        error: err as Error,
      });
    }
  };

  const markComplete = useCallback(async () => {
    try {
      await onboardingRepository.markFlowCompleted(flowId);
      setState((prev) => ({ ...prev, isComplete: true }));
    } catch (err) {
      console.error(`Failed to mark flow complete: ${flowId}`, err);
      throw err;
    }
  }, [flowId]);

  const markStep = useCallback(
    async (stepId: OnboardingStepId) => {
      try {
        await onboardingRepository.markStepCompleted(flowId, stepId);
        setState((prev) => ({
          ...prev,
          completedSteps: [...new Set([...prev.completedSteps, stepId])],
        }));
      } catch (err) {
        console.error(`Failed to mark step complete: ${stepId}`, err);
        throw err;
      }
    },
    [flowId],
  );

  const reset = useCallback(async () => {
    try {
      await onboardingRepository.resetOnboardingFlow(flowId);
      setState({
        isComplete: false,
        completedSteps: [],
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error(`Failed to reset flow: ${flowId}`, err);
      throw err;
    }
  }, [flowId]);

  return {
    ...state,
    markComplete,
    markStep,
    reset,
    refresh: loadFlow,
  };
}
