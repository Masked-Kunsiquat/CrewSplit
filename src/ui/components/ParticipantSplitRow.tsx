/**
 * UI COMPONENT - ParticipantSplitRow
 * UI/UX ENGINEER: Row-based participant selector with conditional input field
 */

import React from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { theme } from "@ui/theme";

export type SplitType = "equal" | "percentage" | "amount" | "weight";

interface ParticipantSplitRowProps {
  /** Participant ID */
  id: string;
  /** Participant name */
  name: string;
  /** Avatar color */
  avatarColor?: string;
  /** Whether participant is selected */
  selected: boolean;
  /** Split type to determine input field behavior */
  splitType: SplitType;
  /** Current split value (percentage, weight, or amount) */
  value?: string;
  /** Currency code (for amount type) */
  currency?: string;
  /** Callback when selection changes */
  onToggle: (id: string) => void;
  /** Callback when split value changes */
  onValueChange?: (id: string, value: string) => void;
  /** Whether the row is disabled */
  disabled?: boolean;
}

/**
 * Row component for participant selection with conditional input field.
 * Shows different input types based on split type.
 *
 * @example
 * <ParticipantSplitRow
 *   id="p1"
 *   name="Alice"
 *   selected={true}
 *   splitType="percentage"
 *   value="50"
 *   onToggle={handleToggle}
 *   onValueChange={handleValueChange}
 * />
 */
export function ParticipantSplitRow({
  id,
  name,
  avatarColor,
  selected,
  splitType,
  value = "",
  currency,
  onToggle,
  onValueChange,
  disabled = false,
}: ParticipantSplitRowProps) {
  const showInput = splitType !== "equal" && selected;
  const avatarBgColor = avatarColor || theme.colors.primary;

  // Get placeholder and suffix based on split type
  const getInputConfig = () => {
    switch (splitType) {
      case "percentage":
        return {
          placeholder: "0",
          suffix: "%",
          keyboardType: "decimal-pad" as const,
        };
      case "weight":
        return {
          placeholder: "1",
          suffix: "",
          keyboardType: "decimal-pad" as const,
        };
      case "amount":
        return {
          placeholder: "0.00",
          suffix: currency || "",
          keyboardType: "decimal-pad" as const,
        };
      default:
        return {
          placeholder: "",
          suffix: "",
          keyboardType: "default" as const,
        };
    }
  };

  const inputConfig = getInputConfig();

  return (
    <View style={[styles.row, !selected && styles.rowUnselected]}>
      {/* Pressable area for checkbox + avatar + name */}
      <Pressable
        style={({ pressed }) => [
          styles.toggleArea,
          pressed && styles.toggleAreaPressed,
        ]}
        onPress={() => onToggle(id)}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected, disabled }}
        accessibilityLabel={`${name}, ${selected ? "selected" : "not selected"}`}
      >
        {/* Checkbox */}
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected && <View style={styles.checkboxInner} />}
        </View>

        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: avatarBgColor }]}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>

        {/* Name */}
        <Text
          style={[styles.name, !selected && styles.nameUnselected]}
          numberOfLines={1}
        >
          {name}
        </Text>
      </Pressable>

      {/* Input field (conditional) - outside pressable */}
      {showInput && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={(text) => onValueChange?.(id, text)}
            placeholder={inputConfig.placeholder}
            placeholderTextColor={theme.colors.textMuted}
            keyboardType={inputConfig.keyboardType}
            editable={!disabled}
            accessibilityLabel={`${splitType} value for ${name}`}
          />
          {inputConfig.suffix && (
            <Text style={styles.suffix}>{inputConfig.suffix}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: theme.touchTarget.minHeight,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowUnselected: {
    opacity: 0.5,
  },
  toggleArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.sm,
  },
  toggleAreaPressed: {
    backgroundColor: theme.colors.surface,
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
  checkboxSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: theme.colors.text,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  avatarText: {
    color: theme.colors.text,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.bold,
  },
  name: {
    flex: 1,
    fontSize: theme.typography.base,
    color: theme.colors.text,
    fontWeight: theme.typography.medium,
  },
  nameUnselected: {
    color: theme.colors.textMuted,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    marginRight: theme.spacing.md,
    minWidth: 80,
    height: 36,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.base,
    color: theme.colors.text,
    textAlign: "right",
    padding: 0,
  },
  suffix: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
    minWidth: 20,
  },
});
