import { useState, useEffect, useCallback } from "react";
import { onboardingRepository } from "../repository/OnboardingRepository";

type UseOnboardingStateProps = {
  enabled?: boolean;
};

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

  return { isComplete, loading, error, markComplete, refresh: checkStatus };
}
