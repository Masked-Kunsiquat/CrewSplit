import { useState, useEffect, useCallback } from "react";
import { onboardingRepository } from "../repository/OnboardingRepository";

type UseOnboardingStateProps = {
  enabled?: boolean;
};

/**
 * Manages and exposes the initial onboarding completion state and related actions.
 *
 * @param enabled - When false, the hook will not perform status checks or refreshes (loading remains false).
 * @returns An object containing:
 *  - isComplete: whether the initial onboarding flow is completed
 *  - loading: whether a check or mutation is in progress
 *  - error: the last error encountered, or `null`
 *  - markComplete: function to mark the onboarding flow as completed
 *  - reset: function to reset the onboarding flow to incomplete
 *  - refresh: function to re-check the onboarding completion status
 */
export function useOnboardingState({
  enabled = true,
}: UseOnboardingStateProps = {}) {
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const checkStatus = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const completed =
        await onboardingRepository.isInitialOnboardingCompleted();
      setIsComplete(completed);
    } catch (e) {
      console.error("Failed to check onboarding status", e);
      setError(e as Error);
      setIsComplete(false);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const markComplete = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await onboardingRepository.markFlowCompleted("initial_onboarding");
      setIsComplete(true);
    } catch (e) {
      console.error("Failed to mark onboarding complete", e);
      setError(e as Error);
      setIsComplete(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await onboardingRepository.resetFlow("initial_onboarding");
      setIsComplete(false);
    } catch (e) {
      console.error("Failed to reset onboarding", e);
      setError(e as Error);
      setIsComplete(false);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    isComplete,
    loading,
    error,
    markComplete,
    reset,
    refresh: checkStatus,
  };
}
