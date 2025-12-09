/**
 * EXPENSES MODULE - Expenses List Screen
 * UI/UX ENGINEER: List all expenses for a trip
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Card } from '@ui/components';

export default function ExpensesListScreen() {
  const router = useRouter();
  const { id: tripId } = useLocalSearchParams<{ id: string }>();

  // Mock data - will be replaced with real data from repository
  const mockExpenses = [
    {
      id: '1',
      description: 'Dinner at Restaurant',
      amount: 8500,
      paidBy: 'Alice',
      date: '2024-01-15',
    },
    {
      id: '2',
      description: 'Gas for Road Trip',
      amount: 6000,
      paidBy: 'Bob',
      date: '2024-01-14',
    },
    {
      id: '3',
      description: 'Hotel Booking',
      amount: 18000,
      paidBy: 'Alice',
      date: '2024-01-13',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Expenses</Text>

        {mockExpenses.map((expense) => (
          <Card
            key={expense.id}
            style={styles.expenseCard}
            onPress={() => router.push(`/trips/${tripId}/expenses/${expense.id}`)}
          >
            <View style={styles.expenseHeader}>
              <Text style={styles.expenseDescription}>{expense.description}</Text>
              <Text style={styles.expenseAmount}>
                ${(expense.amount / 100).toFixed(2)}
              </Text>
            </View>
            <View style={styles.expenseMeta}>
              <Text style={styles.metaText}>Paid by {expense.paidBy}</Text>
              <Text style={styles.metaText}>{expense.date}</Text>
            </View>
          </Card>
        ))}

        {mockExpenses.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No expenses yet</Text>
            <Text style={styles.emptySubtext}>
              Add an expense to get started
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Add Expense"
          onPress={() => router.push(`/trips/${tripId}/expenses/add`)}
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
    fontSize: theme.typography.xxxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  expenseCard: {
    marginBottom: theme.spacing.md,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  expenseDescription: {
    flex: 1,
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginRight: theme.spacing.md,
  },
  expenseAmount: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.primary,
  },
  expenseMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
  },
  emptyText: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.typography.base,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
