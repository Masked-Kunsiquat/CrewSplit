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
 * Renders a small "SAMPLE" badge used to mark a trip as a sample or demo.
 *
 * The badge supports two visual variants: `"default"` (amber background) and
 * `"subtle"` (muted low-emphasis background). Intended to be positioned by the
 * consumer (e.g., absolute top-right of a trip card) via the `style` prop.
 *
 * @param style - Optional ViewStyle overrides for positioning and layout.
 * @param variant - Visual variant to apply; `"default"` or `"subtle"`.
 * @returns A React element that displays the "SAMPLE" badge.
 */
export function SampleTripBadge({
  style,
  variant = "default",
}: SampleTripBadgeProps) {
  return (
    <View
      style={[styles.badge, variant === "subtle" && styles.badgeSubtle, style]}
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