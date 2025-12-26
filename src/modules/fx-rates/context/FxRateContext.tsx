/**
 * FX RATE CONTEXT
 * React Context for CachedFxRateProvider
 *
 * Replaces singleton pattern with dependency injection via React Context.
 * Provides a single provider instance throughout the app while maintaining testability.
 */

import {
  createContext,
  useContext,
  type ReactNode,
  useState,
  useEffect,
} from "react";
import { CachedFxRateProvider } from "../provider/cached-fx-rate-provider";
import { fxLogger } from "@utils/logger";
import { createAppError } from "@utils/errors";

const FxRateContext = createContext<CachedFxRateProvider | null>(null);

/**
 * Hook to access FxRateProvider from context
 * Throws if used outside of FxRateProvider
 *
 * Usage:
 * ```tsx
 * const fxRateProvider = useFxRateProvider();
 * const rate = fxRateProvider.getRate('USD', 'EUR');
 * ```
 */
export function useFxRateProvider(): CachedFxRateProvider {
  const provider = useContext(FxRateContext);
  if (!provider) {
    throw createAppError(
      "INVALID_CONTEXT_USAGE",
      "useFxRateProvider must be used within FxRateProvider",
    );
  }
  return provider;
}

interface FxRateProviderProps {
  children: ReactNode;
  /**
   * Optional provider instance for testing
   * If not provided, creates a new singleton instance
   */
  provider?: CachedFxRateProvider;
}

/**
 * FxRateProvider Component
 * Wraps the app and provides FxRateProvider via context
 *
 * Automatically initializes the provider on mount.
 *
 * Usage:
 * ```tsx
 * // In app/_layout.tsx
 * <FxRateProvider>
 *   <App />
 * </FxRateProvider>
 *
 * // In tests
 * <FxRateProvider provider={mockProvider}>
 *   <ComponentUnderTest />
 * </FxRateProvider>
 * ```
 */
export function FxRateProvider({ children, provider }: FxRateProviderProps) {
  // Use provided instance (for tests) or create singleton
  const [providerInstance] = useState(
    () => provider ?? new CachedFxRateProvider(),
  );

  useEffect(() => {
    let mounted = true;

    const initializeProvider = async () => {
      try {
        fxLogger.info("Initializing FX rate provider");
        await providerInstance.initialize();
        if (mounted) {
          fxLogger.info("FX rate provider initialized successfully");
        }
      } catch (error) {
        if (mounted) {
          fxLogger.error("Failed to initialize FX rate provider", error);
          // Don't throw - allow app to continue even if FX init fails
        }
      }
    };

    initializeProvider();

    return () => {
      mounted = false;
    };
  }, [providerInstance]);

  return (
    <FxRateContext.Provider value={providerInstance}>
      {children}
    </FxRateContext.Provider>
  );
}
