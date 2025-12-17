/**
 * UI/UX ENGINEER: Date Picker Component
 * Vanilla flash-calendar single-date selector (no custom calendar logic)
 */

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import {
  Calendar,
  fromDateId,
  toDateId,
} from "@marceloterreiro/flash-calendar";
import { theme } from "@ui/theme";

interface DatePickerProps {
  label?: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  /**
   * Optional date to control the initial month the calendar opens on.
   * Falls back to the current value if not provided.
   */
  initialDate?: Date;
}

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function DatePicker({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  initialDate,
}: DatePickerProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const selectedDateId = useMemo(() => toDateId(value), [value]);
  const [pendingDateId, setPendingDateId] = useState(selectedDateId);
  const initialMonthId = useMemo(
    () => toDateId(initialDate ?? value),
    [initialDate, value],
  );

  useEffect(() => {
    setPendingDateId(selectedDateId);
  }, [selectedDateId]);

  const handleConfirm = () => {
    onChange(fromDateId(pendingDateId));
    setShowCalendar(false);
  };

  const handleClose = () => {
    setPendingDateId(selectedDateId);
    setShowCalendar(false);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowCalendar(true)}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Select date, ${formatDate(value)}`}
        accessibilityHint="Opens the date picker"
      >
        <Text style={styles.buttonText}>{formatDate(value)}</Text>
      </TouchableOpacity>

      {showCalendar && (
        <Modal
          visible={showCalendar}
          animationType="slide"
          transparent
          onRequestClose={handleClose}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select date</Text>
                <TouchableOpacity onPress={handleConfirm}>
                  <Text style={styles.modalButton}>Done</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.calendarContainer}>
                <Calendar.List
                  calendarActiveDateRanges={[
                    { startId: pendingDateId, endId: pendingDateId },
                  ]}
                  calendarInitialMonthId={initialMonthId}
                  calendarMinDateId={
                    minimumDate ? toDateId(minimumDate) : undefined
                  }
                  calendarMaxDateId={
                    maximumDate ? toDateId(maximumDate) : undefined
                  }
                  onCalendarDayPress={setPendingDateId}
                />
              </View>

              <View style={styles.modalFooter}>
                <Text style={styles.helperText}>
                  Tap a day to pick it, then press Done
                </Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  button: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: theme.spacing.md,
    minHeight: 48,
    justifyContent: "center",
  },
  buttonText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  modalButton: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.primary,
  },
  calendarContainer: {
    flex: 1,
  },
  modalFooter: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  helperText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  cancelButton: {
    alignSelf: "center",
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  cancelButtonText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
  },
});
