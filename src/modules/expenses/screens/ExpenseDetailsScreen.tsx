import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Card } from '@ui/components';

export default function ExpenseDetailsScreen() {
  const router = useRouter();
  const { id: tripId, expenseId } = useLocalSearchParams<{ id: string; expenseId: string }>();

  const mockExpense = {
    description: 'Placeholder dinner',
    amount: '$42.00',
    paidBy: 'Alex',
    date: '2024-01-01',
    split: [
      { name: 'Alex', share: '$14.00' },
      { name: 'Bailey', share: '$14.00' },
      { name: 'Cam', share: '$14.00' },
    ],
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Expense Details</Text>
        <Text style={styles.subtitle}>Trip: {tripId}</Text>
        <Text style={styles.subtitle}>Expense: {expenseId}</Text>

        <Card style={styles.placeholderCard}>
          <Text style={styles.eyebrow}>Coming soon</Text>
          <Text style={styles.placeholderText}>
            This screen will show full audit trails, payers, and split math. For now it renders mock
            data so navigation feels real.
          </Text>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{mockExpense.description}</Text>
          <Text style={styles.amount}>{mockExpense.amount}</Text>
          <Text style={styles.meta}>Paid by {mockExpense.paidBy}</Text>
          <Text style={styles.meta}>Date {mockExpense.date}</Text>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Mock split</Text>
          {mockExpense.split.map((entry) => (
            <View key={entry.name} style={styles.splitRow}>
              <Text style={styles.splitName}>{entry.name}</Text>
              <Text style={styles.splitAmount}>{entry.share}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Back to list" variant="outline" onPress={() => router.push(`/trips/${tripId}/expenses`)} fullWidth />
        <View style={{ height: theme.spacing.md }} />
        <Button title="Edit (mock)" onPress={() => {}} fullWidth />
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
  subtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
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
  section: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  sectionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  amount: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  meta: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
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
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
