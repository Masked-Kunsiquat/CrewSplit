/**
 * EXPENSES MODULE - Expense Details Screen
 * UI/UX ENGINEER: View and edit expense details
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Card } from '@ui/components';

export default function ExpenseDetailsScreen() {
  const router = useRouter();
  const { id: tripId, expenseId } = useLocalSearchParams<{ id: string; expenseId: string }>();

  // Mock data - will be replaced with real data from repository
  const mockExpense = {
    id: expenseId,
    description: 'Dinner at Restaurant',
    amount: 8500,
    paidBy: 'Alice',
    date: '2024-01-15',
    splits: [
      { participant: 'Alice', amount: 2833 },
      { participant: 'Bob', amount: 2833 },
      { participant: 'Charlie', amount: 2834 },
    ],
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{mockExpense.description}</Text>

        <Card style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Total Amount</Text>
            <Text style={styles.amount}>
              ${(mockExpense.amount / 100).toFixed(2)}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Paid By</Text>
            <Text style={styles.value}>{mockExpense.paidBy}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{mockExpense.date}</Text>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Split Details</Text>
          {mockExpense.splits.map((split, index) => (
            <View key={index} style={styles.splitRow}>
              <Text style={styles.splitName}>{split.participant}</Text>
              <Text style={styles.splitAmount}>
                ${(split.amount / 100).toFixed(2)}
              </Text>
            </View>
          ))}
        </Card>

        <Text style={styles.helper}>
          This expense was split equally among {mockExpense.splits.length} participants
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Edit Expense"
          variant="outline"
          onPress={() => {/* TODO: Navigate to edit screen */}}
          fullWidth
        />
        <View style={{ height: theme.spacing.md }} />
        <Button
          title="Delete Expense"
          variant="outline"
          onPress={() => {/* TODO: Show delete confirmation */}}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.xxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
  },
  value: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.medium,
    color: theme.colors.text,
  },
  amount: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.primary,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  splitName: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
  },
  splitAmount: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.medium,
    color: theme.colors.textSecondary,
  },
  helper: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
