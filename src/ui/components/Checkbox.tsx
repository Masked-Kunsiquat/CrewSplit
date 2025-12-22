/**
 * UI COMPONENT: Checkbox
 * Reusable checkbox component with label and optional helper text
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { theme } from "@ui/theme";

export interface CheckboxProps {
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Callback when checkbox is toggled */
  onToggle: () => void;
  /** Label text displayed next to checkbox */
  label: string;
  /** Optional helper text displayed below the checkbox */
  helperText?: string;
}

/**
 * Checkbox component for binary selection with label and optional helper text
 *
 * @example
 * <Checkbox
 *   checked={isPersonalExpense}
 *   onToggle={() => setIsPersonalExpense(!isPersonalExpense)}
 *   label="Personal Expense"
 *   helperText="Only you will be included in this expense"
 * />
 */
export function Checkbox({
  checked,
  onToggle,
  label,
  helperText,
}: CheckboxProps) {
  return (
    <View style={styles.container}>
      <Pressable
        style={styles.row}
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <View style={styles.checkboxInner} />}
        </View>
        <Text style={styles.label}>{label}</Text>
      </Pressable>
      {helperText && <Text style={styles.helper}>{helperText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  checkboxChecked: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: theme.colors.background,
  },
  label: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    fontWeight: theme.typography.medium,
    flex: 1,
  },
  helper: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
    marginLeft: 40, // Align with label after checkbox
    marginTop: theme.spacing.xs,
  },
});
