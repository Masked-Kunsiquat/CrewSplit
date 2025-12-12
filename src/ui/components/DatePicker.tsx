/**
 * UI/UX ENGINEER: Date Picker Component
 * Cross-platform date picker wrapper
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { theme } from '@ui/theme';

interface DatePickerProps {
  label?: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

export function DatePicker({ label, value, onChange, minimumDate, maximumDate }: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Select date, ${formatDate(value)}`}
        accessibilityHint="Opens the date picker"
      >
        <Text style={styles.buttonText}>{formatDate(value)}</Text>
      </TouchableOpacity>

      {showPicker && (
        <>
          {Platform.OS === 'ios' && (
            <View style={styles.iosPickerContainer}>
              <View style={styles.iosPickerHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.iosPickerButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={value}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                textColor={theme.colors.text}
              />
            </View>
          )}

          {Platform.OS === 'android' && (
            <DateTimePicker
              value={value}
              mode="date"
              display="default"
              onChange={handleChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
            />
          )}
        </>
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
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
  },
  iosPickerContainer: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iosPickerButton: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.primary,
  },
});
