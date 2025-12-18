/**
 * TRIP EXPORT MODAL
 * UI/UX ENGINEER: Choose export granularity (trip-wide by default).
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { theme } from "@ui/theme";
import { Button } from "@ui/components";
import {
  defaultTripExportOptions,
  TripExportOptions,
  exportTripJsonToFileAndShare,
} from "@modules/trips/export";

type Props = Readonly<{
  visible: boolean;
  tripId: string;
  onClose: () => void;
  initialOptions?: Partial<TripExportOptions>;
}>;

function formatErrorMessage(error: unknown) {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;
  }
  return "Unknown error";
}

export function TripExportModal({
  visible,
  tripId,
  onClose,
  initialOptions,
}: Props) {
  const defaultOptions = useMemo<TripExportOptions>(() => {
    return { ...defaultTripExportOptions, ...initialOptions };
  }, [initialOptions]);

  const [options, setOptions] = useState<TripExportOptions>(defaultOptions);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setOptions(defaultOptions);
  }, [visible, defaultOptions]);

  const toggle = (key: keyof TripExportOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportTripJsonToFileAndShare(tripId, options);
      onClose();
    } catch (error) {
      Alert.alert("Export Failed", formatErrorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.sheet}
          onPress={(e) => e.stopPropagation()}
          accessibilityLabel="Trip export options"
        >
          <Text style={styles.title}>Export Trip</Text>
          <Text style={styles.subtitle}>
            Trip details are always included. Choose what else to include.
          </Text>

          <View style={styles.options}>
            <OptionRow
              label="Participants"
              description="Names and IDs (trip members)"
              checked={options.participants}
              onPress={() => toggle("participants")}
            />
            <OptionRow
              label="Expenses & splits"
              description="Expenses, payer, amounts, and split records"
              checked={options.expenses}
              onPress={() => toggle("expenses")}
            />
            <OptionRow
              label="Categories"
              description="System + custom categories referenced by the trip"
              checked={options.categories}
              onPress={() => toggle("categories")}
            />
          </View>

          <View style={styles.footer}>
            <View style={styles.footerRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={onClose}
                disabled={exporting}
                accessibilityLabel="Cancel export"
              />
              <Button
                title={exporting ? "Exporting..." : "Export JSON"}
                onPress={handleExport}
                disabled={exporting}
                accessibilityLabel="Export trip as JSON"
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function OptionRow({
  label,
  description,
  checked,
  onPress,
}: Readonly<{
  label: string;
  description: string;
  checked: boolean;
  onPress: () => void;
}>) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        pressed && styles.optionRowPressed,
      ]}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
    >
      <View style={styles.optionText}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>

      <View
        style={[
          styles.checkbox,
          checked ? styles.checkboxChecked : styles.checkboxUnchecked,
        ]}
      >
        <Text style={styles.checkboxText}>{checked ? "✓" : ""}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.lg,
  },
  title: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
  },
  options: {
    gap: theme.spacing.sm,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
  },
  optionRowPressed: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  optionText: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  optionLabel: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  optionDescription: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxUnchecked: {
    backgroundColor: "transparent",
    borderColor: theme.colors.border,
  },
  checkboxText: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    marginTop: -1,
  },
  footer: {
    marginTop: theme.spacing.sm,
  },
  footerRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    justifyContent: "flex-end",
  },
});
