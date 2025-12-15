/**
 * UI/UX ENGINEER: TripSummaryCard component
 * Displays summary statistics: participants count, expenses count, and total
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@ui/theme';
import { Card } from '@ui/components';
import { formatCurrency } from '@utils/currency';

interface TripSummaryCardProps {
  participantCount: number;
  expenseCount: number;
  totalExpenses: number;
  currency: string;
}

export function TripSummaryCard({
  participantCount,
  expenseCount,
  totalExpenses,
  currency,
}: TripSummaryCardProps) {
  return (
    <Card style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Participants</Text>
        <Text style={styles.summaryValue}>{participantCount}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Expenses</Text>
        <Text style={styles.summaryValue}>{expenseCount}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Total</Text>
        <Text style={styles.summaryValue}>{formatCurrency(totalExpenses, currency)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  summaryLabel: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
});
