/**
 * UI COMPONENT - SplitValidationSummary
 * UI/UX ENGINEER: Running total and validation feedback for split types
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "@ui/theme";
import { formatCurrency } from "@utils/currency";
import type { SplitType } from "./ParticipantSplitRow";

interface SplitValidationSummaryProps {
  /** Split type to determine validation logic */
  splitType: SplitType;
  /** Current total (percentage sum, amount sum, etc.) */
  current: number;
  /** Expected target (100 for percentage, expense amount for amount type) */
  target?: number;
  /** Currency code (for amount type) */
  currency?: string;
  /** Whether validation is passing */
  isValid: boolean;
}

/**
 * Shows running total and validation status for split types.
 *
 * @example
 * <SplitValidationSummary
 *   splitType="percentage"
 *   current={85}
 *   target={100}
 *   isValid={false}
 * />
 */
export function SplitValidationSummary({
  splitType,
  current,
  target = 100,
  currency,
  isValid,
}: SplitValidationSummaryProps) {
  // Don't show summary for equal or weight splits
  if (splitType === "equal" || splitType === "weight") {
    return null;
  }

  const getDisplayText = () => {
    if (splitType === "percentage") {
      return `${current.toFixed(1)}/${target}%`;
    }
    if (splitType === "amount" && currency) {
      return `${formatCurrency(current, currency)}/${formatCurrency(target, currency)}`;
    }
    return "";
  };

  const displayText = getDisplayText();
  const accessibilityLabel = `${displayText}, ${isValid ? "valid" : "invalid"}`;

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isValid }}
    >
      <Text style={[styles.text, isValid && styles.textValid]}>
        {displayText}
        {isValid && " ✓"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.sm,
  },
  text: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
    fontWeight: theme.typography.medium,
  },
  textValid: {
    color: theme.colors.success,
  },
});
