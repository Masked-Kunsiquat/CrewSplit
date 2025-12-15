/**
 * UI/UX ENGINEER: TripHeader component
 * Displays trip emoji, name, currency, dates, and edit button
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@ui/theme';
import type { Trip } from '../../types';

interface TripHeaderProps {
  trip: Trip;
  onEdit: () => void;
}

export function TripHeader({ trip, onEdit }: TripHeaderProps) {
  const startDateLabel = new Date(trip.startDate).toLocaleDateString();
  const endDateLabel = trip.endDate ? new Date(trip.endDate).toLocaleDateString() : null;
  const dateRangeLabel = endDateLabel ? `${startDateLabel} - ${endDateLabel}` : startDateLabel;

  return (
    <View style={styles.header}>
      <View style={styles.headerMain}>
        {trip.emoji && <Text style={styles.headerEmoji}>{trip.emoji}</Text>}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{trip.name}</Text>
          <Text style={styles.subtitle}>{trip.currency}</Text>
          <Text style={[styles.subtitle, styles.dateLine]}>{dateRangeLabel}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={onEdit}
        style={styles.editButton}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Edit trip name"
        accessibilityHint="Opens the edit screen for the trip name"
      >
        <Text style={styles.editButtonText}>✏️</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    flex: 1,
  },
  headerEmoji: {
    fontSize: 48,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.xxxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  dateLine: {
    marginTop: theme.spacing.xs / 2,
  },
  editButton: {
    padding: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignSelf: 'flex-start',
  },
  editButtonText: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.primary,
  },
});
