/**
 * ONBOARDING - Sample Trip Badge
 * UI/UX ENGINEER: Visual indicator for sample trips
 *
 * Displays a small "SAMPLE" badge on trip cards to distinguish
 * sample data from user-created trips.
 */

import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { theme } from "@/ui/theme";

export interface SampleTripBadgeProps {
  /** Optional custom style for positioning */
  style?: ViewStyle;
  /** Variant: default (amber) or subtle (muted) */
  variant?: "default" | "subtle";
}

/**
 * Badge that marks a trip as a sample/demo trip
 *
 * Visual design:
 * - Small uppercase "SAMPLE" text
 * - Amber background (theme.colors.warning) for visibility
 * - Dark text for contrast (WCAG AAA compliant)
 * - Rounded corners matching design system
 *
 * Usage:
 * - Position: absolute top-right of trip card
 * - Only shown when trip.isSampleData === true
 * - Helps users distinguish sample from real data
 *
 * @example
 * // In trip card component:
 * {trip.isSampleData && <SampleTripBadge />}
 *
 * @example
 * // With custom positioning:
 * <SampleTripBadge style={{ top: 12, right: 12 }} />
 */
export function SampleTripBadge({
  style,
  variant = "default",
}: SampleTripBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        variant === "subtle" && styles.badgeSubtle,
        style,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          variant === "subtle" && styles.badgeTextSubtle,
        ]}
      >
        SAMPLE
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    alignSelf: "flex-start",
  },
  badgeSubtle: {
    backgroundColor: theme.colors.textMuted,
    opacity: 0.7,
  },
  badgeText: {
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.bold as any,
    color: theme.colors.background,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badgeTextSubtle: {
    color: theme.colors.background,
  },
});
