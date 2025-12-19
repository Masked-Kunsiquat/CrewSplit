/**
 * ROOT LAYOUT
 * Expo Router entry point
 */

import { Stack, Redirect, usePathname } from "expo-router";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { useDbMigrations } from "@db/client";
import { cachedFxRateProvider } from "@modules/fx-rates/provider";
import { useFxSync } from "@modules/fx-rates/hooks";
import { useOnboardingState } from "@modules/onboarding/hooks/use-onboarding-state";
import { colors, spacing, typography } from "@ui/tokens";
import { fxLogger } from "@utils/logger";

export default function RootLayout() {
  const pathname = usePathname();
  const { success, error } = useDbMigrations();
  const [fxInitialized, setFxInitialized] = useState(false);
  const [fxError, setFxError] = useState<Error | null>(null);

  // Check onboarding status (for future redirect to onboarding screens)
  const {
    isComplete: onboardingComplete,
    loading: onboardingLoading,
    error: onboardingError,
  } = useOnboardingState({ enabled: success });

  // Background sync for FX rates (must be called unconditionally)
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

  // Initialize FX rate provider after migrations complete
  useEffect(() => {
    if (success && !fxInitialized) {
      fxLogger.info("Initializing FX rate provider");
      cachedFxRateProvider
        .initialize()
        .then(() => {
          setFxInitialized(true);
          fxLogger.info("FX rate provider initialized successfully");
        })
        .catch((err) => {
          // Don't block app startup on FX initialization failure
          fxLogger.error("Failed to initialize FX rate provider", err);
          setFxError(err);
          // Allow app to continue even if FX init fails
          setFxInitialized(true);
        });
    }
  }, [success, fxInitialized]);

  // Show migration error
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Database Migration Error</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
      </View>
    );
  }

  // Show loading while migrations, FX initialization, or onboarding check in progress
  if (!success || !fxInitialized || onboardingLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          {!success
            ? "Applying database migrations..."
            : !fxInitialized
              ? "Loading exchange rates..."
              : "Checking welcome status..."}
        </Text>
        {onboardingError ? (
          <Text style={styles.errorMessageSmall}>
            {onboardingError.message}
          </Text>
        ) : null}
      </View>
    );
  }

  // Show warning if FX failed but allow app to continue
  if (fxError) {
    fxLogger.warn(
      "App started with FX rate provider initialization failure - conversions may not work",
    );
  }

  const isOnboardingRoute = pathname?.startsWith("/onboarding");

  if (!onboardingComplete && !isOnboardingRoute) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#1a1a1a",
        },
        headerTintColor: "#ffffff",
        headerTitleStyle: {
          fontWeight: "600",
        },
        contentStyle: {
          backgroundColor: "#0a0a0a",
        },
      }}
    >
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
  );
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
