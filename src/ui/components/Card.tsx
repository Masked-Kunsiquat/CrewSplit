/**
 * UI COMPONENT - Card
 * UI/UX ENGINEER: Container card with elevation
 */

import React from "react";
import { View, StyleSheet, ViewStyle, TouchableOpacity } from "react-native";
import { theme } from "../theme";

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  elevated?: boolean;
  /**
   * Optional label for accessibility; falls back to child text when absent
   */
  label?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
  testID?: string;
  importantForAccessibility?: "auto" | "yes" | "no" | "no-hide-descendants";
}

const deriveLabelFromChildren = (
  children: React.ReactNode,
): string | undefined => {
  const firstChild = React.Children.toArray(children).find((child) => {
    const type = typeof child;
    return type === "string" || type === "number";
  });

  if (firstChild === undefined) return undefined;

  if (typeof firstChild === "string" || typeof firstChild === "number") {
    const value = String(firstChild).trim();
    return value.length ? value : undefined;
  }

  return undefined;
};

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  elevated = false,
  label,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  testID,
  importantForAccessibility,
}) => {
  const cardStyle = [styles.card, elevated && styles.elevated, style];

  const computedLabel =
    accessibilityLabel ?? label ?? deriveLabelFromChildren(children);

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.8}
        accessible
        accessibilityRole="button"
        accessibilityLabel={computedLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !!disabled }}
        disabled={!!disabled}
        testID={testID}
        importantForAccessibility={importantForAccessibility}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  elevated: {
    ...theme.shadows.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
});
