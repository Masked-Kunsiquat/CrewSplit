/**
 * UI COMPONENT - Staleness Warning Banner
 * UI/UX ENGINEER: Banner to warn users when FX rates are stale (>24 hours old)
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { theme } from "@ui/theme";

export interface StalenessWarningBannerProps {
  /**
   * Currency pair for context (e.g., "USD → EUR")
   */
  currencyPair?: string;
  /**
   * Number of days since last update
   */
  daysOld: number;
  /**
   * Callback when user taps the refresh action
   */
  onRefresh?: () => void;
  /**
   * Show loading state during refresh
   */
  refreshing?: boolean;
}

/**
 * Warning banner component for stale exchange rates
 *
 * Displays when rates are older than 24 hours, with option to refresh.
 *
 * @example
 * <StalenessWarningBanner
 *   currencyPair="USD → EUR"
 *   daysOld={14}
 *   onRefresh={handleRefresh}
 *   refreshing={isRefreshing}
 * />
 */
export function StalenessWarningBanner({
  currencyPair,
  daysOld,
  onRefresh,
  refreshing = false,
}: StalenessWarningBannerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>⚠️</Text>
        <View style={styles.textContent}>
          <Text style={styles.title}>Exchange rate is {daysOld} days old</Text>
          <Text style={styles.message}>
            {currencyPair
              ? `The ${currencyPair} rate may be outdated.`
              : "This exchange rate may be outdated."}
            {onRefresh
              ? " Tap to refresh with latest rates."
              : " Consider updating rates in Settings."}
          </Text>
        </View>
      </View>

      {onRefresh && (
        <Pressable
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && styles.refreshButtonPressed,
          ]}
          onPress={onRefresh}
          disabled={refreshing}
          accessibilityRole="button"
          accessibilityLabel="Refresh exchange rates"
          accessibilityHint="Updates exchange rates from online sources"
          accessibilityState={{ busy: refreshing }}
        >
          <Text style={styles.refreshButtonText}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.warningBg,
    borderColor: theme.colors.warning,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
  },
  icon: {
    fontSize: theme.typography.xl,
  },
  textContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.warning,
  },
  message: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  refreshButton: {
    backgroundColor: theme.colors.warning,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    alignItems: "center",
    minHeight: theme.touchTarget.minHeight,
    justifyContent: "center",
  },
  refreshButtonPressed: {
    opacity: 0.7,
  },
  refreshButtonText: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.background,
  },
});
