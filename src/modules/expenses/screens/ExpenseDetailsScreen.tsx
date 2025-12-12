/**
 * UI/UX ENGINEER: Expense Details Screen
 * Shows expense details with original, converted, and display currency amounts
 */

import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Card } from '@ui/components';
import { useExpenseWithSplits } from '../hooks/use-expenses';
import { useParticipants } from '@modules/participants/hooks/use-participants';
import { useTripById } from '@modules/trips/hooks/use-trips';
import { useDisplayCurrency } from '@hooks/use-display-currency';
import { formatCurrency } from '@utils/currency';
import { defaultFxRateProvider } from '@modules/settlement/service/DisplayCurrencyAdapter';
import { deleteExpense } from '../repository';

export default function ExpenseDetailsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id: tripId, expenseId } = useLocalSearchParams<{ id: string; expenseId: string }>();
  const { displayCurrency } = useDisplayCurrency();

  const { trip } = useTripById(tripId as string);
  const { expense, splits, loading: expenseLoading, error: expenseError } = useExpenseWithSplits(
    expenseId as string
  );
  const { participants, loading: participantsLoading } = useParticipants(tripId as string);

  // Set dynamic header title
  useEffect(() => {
    if (trip && expense) {
      navigation.setOptions({
        headerTitle: `${trip.name} - ${expense.description}`,
      });
    }
  }, [trip, expense, navigation]);

  // Map participant IDs to names
  const participantMap = useMemo(() => {
    const map = new Map<string, string>();
    participants.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [participants]);

  // Calculate display currency amounts if requested
  const displayAmounts = useMemo(() => {
    if (!expense || !displayCurrency) return null;

    try {
      // Convert expense amounts to display currency
      const fxRate = defaultFxRateProvider.getRate(
        expense.currency,
        displayCurrency
      );

      return {
        originalAmount: expense.originalAmountMinor !== expense.convertedAmountMinor
          ? {
              amount: expense.originalAmountMinor,
              currency: expense.originalCurrency,
            }
          : null,
        convertedAmount: {
          amount: expense.convertedAmountMinor,
          currency: expense.currency,
        },
        displayAmount: {
          amount: Math.round(expense.convertedAmountMinor * fxRate),
          currency: displayCurrency,
        },
        fxRate,
      };
    } catch (error) {
      console.warn('Failed to convert to display currency:', error);
      return null;
    }
  }, [expense, displayCurrency]);

  const loading = expenseLoading || participantsLoading;

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading expense...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (expenseError || !expense) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>Error Loading Expense</Text>
          <Text style={styles.errorText}>
            {expenseError?.message || 'Expense not found'}
          </Text>
          <Button
            title="Back to list"
            onPress={() => router.push(`/trips/${tripId}/expenses`)}
          />
        </View>
      </View>
    );
  }

  const paidByName = participantMap.get(expense.paidBy) || 'Unknown';
  const showCurrencyConversion = expense.originalCurrency !== expense.currency;
  const showDisplayCurrency = !!displayAmounts;

  const handleDelete = () => {
    Alert.alert(
      'Delete Expense',
      `Delete "${expense.description}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(expenseId as string);
              router.push(`/trips/${tripId}/expenses`);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Expense Details</Text>

        {/* Main Expense Info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{expense.description}</Text>

          {/* Original Amount (if different from trip currency) */}
          {showCurrencyConversion && (
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Original amount:</Text>
              <Text style={styles.amount}>
                {formatCurrency(expense.originalAmountMinor, expense.originalCurrency)}
              </Text>
            </View>
          )}

          {/* Converted Amount (trip currency) */}
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>
              {showCurrencyConversion ? 'Converted to trip currency:' : 'Amount:'}
            </Text>
            <Text style={[styles.amount, styles.primaryAmount]}>
              {formatCurrency(expense.convertedAmountMinor, expense.currency)}
            </Text>
          </View>

          {/* Display Currency Amount */}
          {showDisplayCurrency && displayAmounts && (
            <View style={styles.amountRow}>
              <Text style={styles.displayLabel}>Display currency:</Text>
              <Text style={styles.displayAmount}>
                {formatCurrency(
                  displayAmounts.displayAmount.amount,
                  displayAmounts.displayAmount.currency
                )}
              </Text>
            </View>
          )}

          {/* Exchange Rate Info */}
          {showCurrencyConversion && expense.fxRateToTrip && (
            <View style={styles.fxRateRow}>
              <Text style={styles.fxRateText}>
                Exchange rate: 1 {expense.originalCurrency} = {expense.fxRateToTrip.toFixed(4)}{' '}
                {expense.currency}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Paid by:</Text>
            <Text style={styles.metaValue}>{paidByName}</Text>
          </View>

          {expense.category && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Category:</Text>
              <Text style={styles.metaValue}>{expense.category}</Text>
            </View>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Date:</Text>
            <Text style={styles.metaValue}>
              {new Date(expense.date).toLocaleDateString()}
            </Text>
          </View>
        </Card>

        {/* Splits Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Split Details</Text>
          {splits.length > 0 ? (
            splits.map((split) => {
              const participantName = participantMap.get(split.participantId) || 'Unknown';
              return (
                <View key={split.id} style={styles.splitRow}>
                  <View style={styles.splitInfo}>
                    <Text style={styles.splitName}>{participantName}</Text>
                    <Text style={styles.splitType}>
                      {split.shareType === 'equal' && 'Equal share'}
                      {split.shareType === 'percentage' && `${split.share}%`}
                      {split.shareType === 'weight' && `Weight: ${split.share}`}
                      {split.shareType === 'amount' && 'Fixed amount'}
                    </Text>
                  </View>
                  <View style={styles.splitAmounts}>
                    {split.amount !== undefined && split.amount !== null && (
                      <>
                        <Text style={styles.splitAmount}>
                          {formatCurrency(split.amount, expense.currency)}
                        </Text>
                        {showDisplayCurrency && displayAmounts && (
                          <Text style={styles.displayAmountSmall}>
                            {formatCurrency(
                              Math.round(split.amount * displayAmounts.fxRate),
                              displayAmounts.displayAmount.currency
                            )}
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No split information available</Text>
          )}
        </Card>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoText}>
            All amounts are stored in cents to avoid floating-point errors.
            {showCurrencyConversion &&
              ' Currency conversions are applied at the time of expense creation.'}
          </Text>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <View style={styles.buttonHalf}>
            <Button
              title="Back"
              variant="outline"
              onPress={() => router.push(`/trips/${tripId}/expenses`)}
              fullWidth
            />
          </View>
          <View style={styles.buttonHalf}>
            <Button
              title="Delete"
              variant="outline"
              onPress={handleDelete}
              fullWidth
            />
          </View>
        </View>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.xxxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  loadingText: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
  },
  errorTitle: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  section: {
    backgroundColor: theme.colors.surfaceElevated,
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  amountLabel: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  amount: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  primaryAmount: {
    fontSize: theme.typography.xl,
    color: theme.colors.primary,
  },
  displayLabel: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  displayAmount: {
    fontSize: theme.typography.base,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  displayAmountSmall: {
    fontSize: theme.typography.xs,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  fxRateRow: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  fxRateText: {
    fontSize: theme.typography.xs,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  metaLabel: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  metaValue: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    fontWeight: theme.typography.medium,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  splitInfo: {
    flex: 1,
    gap: 2,
  },
  splitName: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    fontWeight: theme.typography.medium,
  },
  splitType: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
  },
  splitAmounts: {
    alignItems: 'flex-end',
    gap: 2,
  },
  splitAmount: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  emptyText: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.lg,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
  },
  infoText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  buttonHalf: {
    flex: 1,
  },
});
