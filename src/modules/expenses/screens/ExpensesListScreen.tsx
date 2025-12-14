import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Card } from '@ui/components';
import { useExpenses } from '../hooks/use-expenses';
import { useTripById } from '../../trips/hooks/use-trips';
import { formatCurrency } from '@utils/currency';

export default function ExpensesListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id: tripId, filter, ids } = useLocalSearchParams<{
    id: string;
    filter?: string;
    ids?: string;
  }>();

  const { trip } = useTripById(tripId);
  const { expenses, loading, error } = useExpenses(tripId);

  // Parse filter IDs if provided
  const filterIds = ids ? ids.split(',').map(id => id.trim()) : null;

  // Filter expenses if IDs are provided
  const displayedExpenses = filterIds
    ? expenses.filter(expense => filterIds.includes(expense.id))
    : expenses;

  // Determine header title based on filter
  const headerTitle = filter === 'unsplit'
    ? 'Unsplit Expenses'
    : trip
      ? `${trip.name} - Expenses`
      : 'Expenses';

  // Update native header title
  useEffect(() => {
    navigation.setOptions({
      title: headerTitle,
    });
  }, [headerTitle, navigation]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error.message}</Text>
          </Card>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {displayedExpenses.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {filterIds ? 'No matching expenses' : 'No expenses yet'}
            </Text>
            <Text style={styles.emptyText}>
              {filterIds
                ? 'The filtered expenses are not available.'
                : 'Add your first expense to start tracking shared costs.'}
            </Text>
          </Card>
        ) : (
          displayedExpenses.map((expense) => (
            <Card
              key={expense.id}
              style={styles.expenseCard}
              onPress={() => router.push(`/trips/${tripId}/expenses/${expense.id}`)}
            >
              <View style={styles.expenseHeader}>
                <Text style={styles.expenseTitle}>{expense.description}</Text>
                <Text style={styles.expenseAmount}>
                  {formatCurrency(expense.convertedAmountMinor, trip?.currency || 'USD')}
                </Text>
              </View>
              <Text style={styles.expenseMeta}>
                {new Date(expense.date).toLocaleDateString()}
                {expense.category ? ` • ${expense.category}` : ''}
              </Text>
            </Card>
          ))
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
    gap: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.xxxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    padding: theme.spacing.lg,
  },
  errorCard: {
    backgroundColor: theme.colors.error,
  },
  errorText: {
    fontSize: theme.typography.base,
    color: theme.colors.background,
  },
  emptyCard: {
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderWidth: 1,
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  expenseCard: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  expenseTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    flex: 1,
  },
  expenseAmount: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.primary,
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
