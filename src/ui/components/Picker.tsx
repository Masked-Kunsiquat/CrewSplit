/**
 * UI COMPONENT - Picker
 * UI/UX ENGINEER: Dropdown/picker component for selecting from a list of options
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
} from "react-native";
import { theme } from "../theme";

export interface PickerOption<T = string> {
  label: string;
  value: T;
  icon?: React.ReactNode;
}

interface PickerProps<T = string> {
  /** Label shown above the picker */
  label?: string;
  /** Currently selected value */
  value: T;
  /** List of options to choose from */
  options: PickerOption<T>[];
  /** Callback when selection changes */
  onChange: (value: T) => void;
  /** Placeholder text when no value selected */
  placeholder?: string;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Helper text to display */
  helperText?: string;
}

/**
 * Dropdown picker component for selecting from a list of options.
 *
 * @example
 * <Picker
 *   label="Split Type"
 *   value={splitType}
 *   options={[
 *     { label: 'Equal', value: 'equal' },
 *     { label: 'Percentage', value: 'percentage' }
 *   ]}
 *   onChange={setSplitType}
 * />
 */
export function Picker<T extends string = string>({
  label,
  value,
  options,
  onChange,
  placeholder = "Select...",
  disabled = false,
  error,
  helperText,
}: PickerProps<T>) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption?.label || placeholder;

  const handleSelect = (optionValue: T) => {
    onChange(optionValue);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        style={({ pressed }) => [
          styles.trigger,
          error && styles.triggerError,
          disabled && styles.triggerDisabled,
          pressed && !disabled && styles.triggerPressed,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label || "Picker"}
        accessibilityHint={`Currently selected: ${displayText}`}
      >
        <View style={styles.triggerContent}>
          {selectedOption?.icon && (
            <View style={styles.triggerIcon}>{selectedOption.icon}</View>
          )}
          <Text
            style={[
              styles.triggerText,
              !selectedOption && styles.triggerTextPlaceholder,
              disabled && styles.triggerTextDisabled,
            ]}
          >
            {displayText}
          </Text>
        </View>
        <Text style={styles.chevron}>▼</Text>
      </Pressable>

      {error && <Text style={styles.errorText}>{error}</Text>}
      {helperText && !error && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              {label && <Text style={styles.modalTitle}>{label}</Text>}
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.option,
                    item.value === value && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}
                  onPress={() => handleSelect(item.value)}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: item.value === value }}
                >
                  <View style={styles.optionContent}>
                    {item.icon && (
                      <View style={styles.optionIcon}>{item.icon}</View>
                    )}
                    <Text
                      style={[
                        styles.optionText,
                        item.value === value && styles.optionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  {item.value === value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    minHeight: theme.touchTarget.minHeight,
  },
  triggerPressed: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  triggerError: {
    borderColor: theme.colors.error,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  triggerIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.sm,
  },
  triggerText: {
    flex: 1,
    fontSize: theme.typography.base,
    color: theme.colors.text,
    marginRight: theme.spacing.xs,
  },
  triggerTextPlaceholder: {
    color: theme.colors.textMuted,
  },
  triggerTextDisabled: {
    color: theme.colors.textMuted,
  },
  chevron: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  errorText: {
    fontSize: theme.typography.sm,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  helperText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    width: "100%",
    maxWidth: 400,
    maxHeight: "70%",
    ...theme.shadows.lg,
  },
  modalHeader: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    minHeight: theme.touchTarget.minHeight,
  },
  optionPressed: {
    backgroundColor: theme.colors.surface,
  },
  optionSelected: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.sm,
  },
  optionText: {
    flex: 1,
    fontSize: theme.typography.base,
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  optionTextSelected: {
    color: theme.colors.primary,
    fontWeight: theme.typography.medium,
  },
  checkmark: {
    fontSize: theme.typography.lg,
    color: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
});
