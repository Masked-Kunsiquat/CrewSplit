/**
 * ROOT LAYOUT
 * Expo Router entry point
 */

import { Stack, Redirect, usePathname } from "expo-router";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useEffect, useRef, useState } from "react";
import { useDbMigrations } from "@db/client";
import { FxRateProvider } from "@modules/fx-rates";
import { useFxSync } from "@modules/fx-rates/hooks";
import { useOnboardingState } from "@modules/onboarding/hooks/use-onboarding-state";
import { initializeImportExport } from "@modules/import-export";
import { migrateAllTrips } from "@modules/automerge/migration";
import {
  detectStaleTrips,
  rebuildTripCache,
} from "@modules/automerge/repository";
import { AutomergeManager } from "@modules/automerge/service/AutomergeManager";
import { colors, spacing, typography } from "@ui/tokens";
import { fxLogger, automergeLogger } from "@utils/logger";

/**
 * Root layout component that coordinates database migrations, Automerge migration, FX provider initialization, background FX synchronization, onboarding state checks, and top-level navigation.
 *
 * This component:
 * - Waits for database migrations to complete and shows an error view if migrations fail.
 * - Runs one-time Automerge migration (SQLite → Automerge docs)
 * - Detects and rebuilds stale Automerge caches
 * - Provides FX rate provider via React Context and initializes it automatically.
 * - Runs background FX sync (non-blocking on failure).
 * - Checks onboarding completion and redirects to the onboarding welcome screen when needed.
 * - Renders a centered loader while migrations or onboarding checks are in progress.
 * - Renders the app navigation Stack (main, settings, onboarding) once initialization and onboarding checks complete.
 *
 * @returns The root React element for the app: either a migration error view, a loading view, an onboarding redirect, or the main navigation stack.
 */
export default function RootLayout() {
  const pathname = usePathname();
  const { success, error } = useDbMigrations();
  const [automergeReady, setAutomergeReady] = useState(false);
  const [automergeError, setAutomergeError] = useState<string | null>(null);

  // Run Automerge migration after DB migrations complete
  useEffect(() => {
    if (!success) return;

    (async () => {
      try {
        automergeLogger.info("Starting Automerge initialization");

        // Step 1: Run one-time migration (SQLite → Automerge)
        const migratedCount = await migrateAllTrips();
        if (migratedCount > 0) {
          automergeLogger.info(`Migrated ${migratedCount} trips to Automerge`);
        }

        // Step 2: Detect and rebuild stale caches
        const staleTrips = await detectStaleTrips();
        if (staleTrips.length > 0) {
          automergeLogger.warn(
            `Rebuilding ${staleTrips.length} stale trip caches`,
          );
          const manager = new AutomergeManager();

          for (const tripId of staleTrips) {
            try {
              const doc = await manager.loadTrip(tripId);
              if (doc) {
                await rebuildTripCache(tripId, doc);
                automergeLogger.info(`Rebuilt cache for trip ${tripId}`);
              }
            } catch (error) {
              automergeLogger.error(
                `Failed to rebuild cache for trip ${tripId}`,
                error,
              );
            }
          }
        }

        setAutomergeReady(true);
        automergeLogger.info("Automerge initialization complete");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        automergeLogger.error("Automerge initialization failed", error);
        setAutomergeError(message);
        setAutomergeReady(true); // Still set ready to not block app
      }
    })();
  }, [success]);

  // Check onboarding status (for future redirect to onboarding screens)
  const {
    isComplete: onboardingComplete,
    loading: onboardingLoading,
    error: onboardingError,
    refresh: refreshOnboarding,
  } = useOnboardingState({ enabled: success && automergeReady });

  const isOnboardingRoute = pathname?.startsWith("/onboarding");
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    if (!success) {
      previousPath.current = pathname ?? null;
      return;
    }

    const prior = previousPath.current;
    previousPath.current = pathname ?? null;

    if (prior?.startsWith("/onboarding") && !isOnboardingRoute) {
      refreshOnboarding();
    }
  }, [pathname, success, isOnboardingRoute, refreshOnboarding]);

  // Initialize import/export system after migrations complete
  useEffect(() => {
    if (success) {
      initializeImportExport();
    }
  }, [success]);

  // Show migration error
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Database Migration Error</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
      </View>
    );
  }

  // Show loading while migrations, Automerge init, or onboarding check in progress
  if (!success || !automergeReady || onboardingLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          {!success
            ? "Applying database migrations..."
            : !automergeReady
              ? "Initializing data sync..."
              : "Checking welcome status..."}
        </Text>
        {automergeError ? (
          <Text style={styles.errorMessageSmall}>
            Warning: {automergeError}
          </Text>
        ) : null}
        {onboardingError ? (
          <Text style={styles.errorMessageSmall}>
            {onboardingError.message}
          </Text>
        ) : null}
      </View>
    );
  }

  if (!onboardingComplete && !isOnboardingRoute) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return (
    <FxRateProvider>
      <FxSyncWrapper />
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontSize: typography.xl,
            fontWeight: typography.semibold,
            color: colors.text,
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerBackVisible: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen name="settings" />
        <Stack.Screen
          name="import-export"
          options={{
            title: "Import & Export",
          }}
        />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack>
    </FxRateProvider>
  );
}

/**
 * FxSyncWrapper component
 * Wraps the FX sync hook inside the FxRateProvider context
 */
function FxSyncWrapper() {
  // Background sync for FX rates (must be called inside FxRateProvider)
  // Safe to run before provider initialization: checkStaleness only queries DB,
  // and performBackgroundRefresh is delayed (1s) to allow initialization to complete
  useFxSync({
    autoRefresh: true,
    onRefreshSuccess: (count) => {
      fxLogger.info(`Background FX sync completed: ${count} rates updated`);
    },
    onRefreshError: (error) => {
      fxLogger.warn("Background FX sync failed (non-fatal)", error);
    },
  });

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  errorTitle: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: "center",
  },
  errorMessageSmall: {
    marginTop: spacing.sm,
    fontSize: typography.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
