/**
 * UI/UX ENGINEER: TripActionCards component
 * Grid of action cards for navigating to different trip sections
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@ui/theme';
import { Card } from '@ui/components';

interface TripActionCardsProps {
  tripId: string;
  participantCount: number;
  expenseCount: number;
  onNavigate: (path: string) => void;
}

export function TripActionCards({
  tripId,
  participantCount,
  expenseCount,
  onNavigate,
}: TripActionCardsProps) {
  return (
    <View style={styles.actionGrid}>
      <Card
        style={styles.actionCard}
        onPress={() => onNavigate(`/trips/${tripId}/participants`)}
      >
        <Text style={styles.actionTitle}>Participants</Text>
        <Text style={styles.actionBody}>
          {participantCount === 0
            ? 'Add participants to track who shares expenses'
            : `Manage ${participantCount} participant${participantCount !== 1 ? 's' : ''}`}
        </Text>
      </Card>

      <Card
        style={styles.actionCard}
        onPress={() => onNavigate(`/trips/${tripId}/expenses`)}
      >
        <Text style={styles.actionTitle}>Expenses</Text>
        <Text style={styles.actionBody}>
          {expenseCount === 0
            ? 'No expenses yet - add your first expense'
            : `View ${expenseCount} expense${expenseCount !== 1 ? 's' : ''}`}
        </Text>
      </Card>

      <Card
        style={styles.actionCard}
        onPress={() => onNavigate(`/trips/${tripId}/settlement`)}
      >
        <Text style={styles.actionTitle}>Settlement</Text>
        <Text style={styles.actionBody}>
          {expenseCount === 0
            ? 'Settlement will appear once expenses are added'
            : 'View who owes whom'}
        </Text>
      </Card>

      <Card
        style={styles.actionCard}
        onPress={() => onNavigate(`/trips/${tripId}/statistics`)}
      >
        <Text style={styles.actionTitle}>Statistics</Text>
        <Text style={styles.actionBody}>
          {expenseCount === 0
            ? 'Statistics will appear once expenses are added'
            : 'View trip insights and breakdowns'}
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  actionGrid: {
    gap: theme.spacing.md,
  },
  actionCard: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  actionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  actionBody: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
  },
});
