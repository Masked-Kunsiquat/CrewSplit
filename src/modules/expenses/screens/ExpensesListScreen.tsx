import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Card } from '@ui/components';

export default function ExpensesListScreen() {
  const router = useRouter();
  const { id: tripId } = useLocalSearchParams<{ id: string }>();

  const mockExpenses = [
    { id: 'exp-1', description: 'Placeholder dinner', note: 'Mock only' },
    { id: 'exp-2', description: 'Placeholder gas', note: 'Mock only' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Expenses</Text>

        <Card style={styles.placeholderCard}>
          <Text style={styles.eyebrow}>Coming soon</Text>
          <Text style={styles.placeholderText}>
            This list will hydrate from SQLite once the repository is connected. Tap a mock row to
            see the detail scaffold.
          </Text>
        </Card>

        {mockExpenses.map((expense) => (
          <Card
            key={expense.id}
            style={styles.expenseCard}
            onPress={() => router.push(`/trips/${tripId}/expenses/${expense.id}`)}
          >
            <Text style={styles.expenseTitle}>{expense.description}</Text>
            <Text style={styles.expenseMeta}>{expense.note}</Text>
          </Card>
        ))}
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
    gap: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.xxxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  placeholderCard: {
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  eyebrow: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  placeholderText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
  },
  expenseCard: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  expenseTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  expenseMeta: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
