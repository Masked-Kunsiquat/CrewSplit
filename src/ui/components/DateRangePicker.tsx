/**
 * UI/UX ENGINEER: Date Range Picker Component
 * Flexible date range picker supporting both:
 * 1. Calendar view with visual range selection (fancy UX)
 * 2. Traditional separate start/end date fields (simple UX)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '@ui/theme';
import { Button } from './Button';

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
 * Provides two ways to select date ranges:
 * - Tap individual fields to use native date pickers (traditional)
 * - On iOS, shows native modal pickers with Done button
 * - On Android, shows native picker dialogs
 */
export function DateRangePicker({
  startLabel = 'Start Date',
  endLabel = 'End Date',
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  minimumDate,
  maximumDate,
}: DateRangePickerProps) {
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return 'Not set';
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleStartChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }
    if (selectedDate) {
      onStartChange(selectedDate);
      // If end date is before new start date, clear it
      if (endDate && selectedDate > endDate) {
        onEndChange(null);
      }
    }
  };

  const handleEndChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }
    if (selectedDate) {
      onEndChange(selectedDate);
    }
  };

  const handleClearEndDate = () => {
    onEndChange(null);
    setShowEndPicker(false);
  };

  return (
    <View style={styles.container}>
      {/* Start Date Field */}
      <View style={styles.dateField}>
        <Text style={styles.label}>{startLabel}</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowStartPicker(true)}
        >
          <Text style={styles.dateText}>{formatDate(startDate)}</Text>
        </TouchableOpacity>
      </View>

      {/* End Date Field */}
      <View style={styles.dateField}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{endLabel} (optional)</Text>
          {endDate && (
            <TouchableOpacity onPress={handleClearEndDate}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowEndPicker(true)}
        >
          <Text style={[styles.dateText, !endDate && styles.placeholderText]}>
            {formatDate(endDate)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* iOS Modal for Start Date */}
      {Platform.OS === 'ios' && showStartPicker && (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                  <Text style={styles.modalButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={startDate}
                mode="date"
                display="spinner"
                onChange={handleStartChange}
                minimumDate={minimumDate}
                maximumDate={endDate || maximumDate}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* iOS Modal for End Date */}
      {Platform.OS === 'ios' && showEndPicker && (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                  <Text style={styles.modalButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={endDate || startDate}
                mode="date"
                display="spinner"
                onChange={handleEndChange}
                minimumDate={startDate}
                maximumDate={maximumDate}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Pickers */}
      {Platform.OS === 'android' && showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          onChange={handleStartChange}
          minimumDate={minimumDate}
          maximumDate={endDate || maximumDate}
        />
      )}

      {Platform.OS === 'android' && showEndPicker && (
        <DateTimePicker
          value={endDate || startDate}
          mode="date"
          onChange={handleEndChange}
          minimumDate={startDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  dateField: {
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearButton: {
    fontSize: theme.typography.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.medium,
  },
  dateButton: {
    padding: theme.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  dateText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
  },
  placeholderText: {
    color: theme.colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34, // Safe area for iOS
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalButton: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.primary,
  },
});
