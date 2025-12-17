/**
 * UI/UX ENGINEER: Date Range Picker Component
 * Beautiful calendar view with visual range selection using flash-calendar
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import {
  Calendar,
  toDateId,
  fromDateId,
  useDateRange,
} from "@marceloterreiro/flash-calendar";
import { theme } from "@ui/theme";

interface DateRangePickerProps {
  startLabel?: string;
  endLabel?: string;
  startDate: Date;
  endDate?: Date | null;
  onStartChange: (date: Date) => void;
  onEndChange: (date: Date | null) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

/**
 * DateRangePicker Component
 *
 * Uses flash-calendar's useDateRange hook for proper date range handling
 */
export function DateRangePicker({
  startLabel = "Start Date",
  endLabel = "End Date",
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  minimumDate,
  maximumDate,
}: DateRangePickerProps) {
  const [showCalendar, setShowCalendar] = useState(false);

  // Let the library manage everything - completely uncontrolled
  const { calendarActiveDateRanges, onCalendarDayPress, dateRange } =
    useDateRange({
      startId: toDateId(startDate),
      endId: endDate ? toDateId(endDate) : undefined,
    });

  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return "Not set";
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleClearEndDate = () => {
    // Don't call onClearDateRange() - it clears both start and end.
    // Just update parent state; hook will re-initialize on next open.
    onEndChange(null);
  };

  const handleConfirm = () => {
    // Only sync to parent when user confirms
    if (dateRange.startId) {
      onStartChange(fromDateId(dateRange.startId));
    }
    if (dateRange.endId) {
      onEndChange(fromDateId(dateRange.endId));
    } else {
      onEndChange(null);
    }
    setShowCalendar(false);
  };

  return (
    <View style={styles.container}>
      {/* Date Display Button */}
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowCalendar(true)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Select date range. Start date ${formatDate(startDate)}. End date ${formatDate(endDate)}`}
        accessibilityHint="Opens the date picker"
      >
        <View style={styles.dateDisplay}>
          <View style={styles.dateSection}>
            <Text style={styles.label}>{startLabel}</Text>
            <Text style={styles.dateText}>{formatDate(startDate)}</Text>
          </View>
          <Text style={styles.separator}>→</Text>
          <View style={styles.dateSection}>
            <Text style={styles.label}>{endLabel}</Text>
            <Text style={[styles.dateText, !endDate && styles.placeholderText]}>
              {formatDate(endDate)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {endDate && (
        <TouchableOpacity
          onPress={handleClearEndDate}
          style={styles.clearButtonContainer}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Clear end date"
          accessibilityHint="Clears the selected end date"
        >
          <Text style={styles.clearButton}>Clear end date</Text>
        </TouchableOpacity>
      )}

      {/* Calendar Modal */}
      {showCalendar && (
        <Modal
          visible={showCalendar}
          animationType="slide"
          transparent
          onRequestClose={() => setShowCalendar(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Dates</Text>
                <TouchableOpacity
                  onPress={handleConfirm}
                  accessibilityRole="button"
                  accessibilityLabel="Done selecting dates"
                  accessibilityHint="Closes the date picker and applies selected dates"
                >
                  <Text style={styles.modalButton}>Done</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.calendarContainer}>
                <Calendar.List
                  calendarActiveDateRanges={calendarActiveDateRanges}
                  calendarInitialMonthId={toDateId(startDate)}
                  onCalendarDayPress={onCalendarDayPress}
                  calendarMinDateId={
                    minimumDate ? toDateId(minimumDate) : undefined
                  }
                  calendarMaxDateId={
                    maximumDate ? toDateId(maximumDate) : undefined
                  }
                  calendarMonthHeaderHeight={40}
                  calendarRowVerticalSpacing={8}
                  theme={{
                    rowMonth: {
                      content: {
                        color: theme.colors.text,
                        fontWeight: "600",
                      },
                    },
                    rowWeek: {
                      container: {
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.border,
                        paddingBottom: 4,
                      },
                    },
                    itemWeekName: {
                      content: {
                        color: theme.colors.textSecondary,
                      },
                    },
                    itemDay: {
                      base: () => ({
                        container: {
                          backgroundColor: theme.colors.surface,
                        },
                        content: {
                          color: theme.colors.text,
                        },
                      }),
                      today: () => ({
                        container: {
                          borderColor: theme.colors.primary,
                          borderWidth: 1,
                        },
                      }),
                      active: () => ({
                        container: {
                          backgroundColor: theme.colors.primary,
                        },
                        content: {
                          color: theme.colors.background,
                        },
                      }),
                    },
                  }}
                />
              </View>

              <View style={styles.modalFooter}>
                <Text style={styles.helperText}>
                  Tap dates to select your range
                </Text>
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
    gap: theme.spacing.sm,
  },
  dateButton: {
    padding: theme.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  dateDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  dateSection: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  separator: {
    fontSize: theme.typography.lg,
    color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.sm,
  },
  label: {
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
  },
  dateText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    fontWeight: theme.typography.medium,
  },
  placeholderText: {
    color: theme.colors.textMuted,
  },
  clearButtonContainer: {
    alignSelf: "flex-start",
  },
  clearButton: {
    fontSize: theme.typography.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.medium,
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
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  helperText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
});
