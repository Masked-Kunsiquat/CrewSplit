/**
 * UI/UX ENGINEER: Expense Details Screen
 * Shows expense details with original, converted, and display currency amounts
 */

import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Card } from '@ui/components';
import { useExpenseWithSplits } from '../hooks/use-expenses';
import { useExpenseCategories } from '../hooks/use-expense-categories';
import { useParticipants } from '@modules/participants/hooks/use-participants';
import { useDisplayCurrency } from '@hooks/use-display-currency';
import { formatCurrency } from '@utils/currency';
import { defaultFxRateProvider } from '@modules/settlement/service/DisplayCurrencyAdapter';
import { deleteExpense } from '../repository';
import { currencyLogger } from '@utils/logger';
import { useRefreshControl } from '@hooks/use-refresh-control';

export default function ExpenseDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[]; expenseId?: string | string[] }>();
  const tripId = normalizeRouteParam(params.id);
  const expenseId = normalizeRouteParam(params.expenseId);

  if (!tripId || !expenseId) {
    const message = !tripId
      ? 'Missing trip ID. Please go back and try again.'
      : 'Missing expense ID. Please select an expense.';

    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>Invalid Expense</Text>
          <Text style={styles.errorText}>{message}</Text>
          <Button title="Back" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return <ExpenseDetailsContent tripId={tripId} expenseId={expenseId} />;
}

function ExpenseDetailsContent({ tripId, expenseId }: { tripId: string; expenseId: string }) {
  const router = useRouter();
  const navigation = useNavigation();
  const { displayCurrency } = useDisplayCurrency();
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingExpense, setEditingExpense] = useState(false);

  const { expense, splits, loading: expenseLoading, error: expenseError, refetch: refetchExpense } = useExpenseWithSplits(
    expenseId
  );
  const { participants, loading: participantsLoading, refetch: refetchParticipants } = useParticipants(tripId);
  const { categories } = useExpenseCategories(tripId);

  // Pull-to-refresh support (note: categories hook doesn't expose refetch, uses dependency-based refresh)
  const refreshControl = useRefreshControl([refetchExpense, refetchParticipants]);

  // Update native header title with category emoji
  useEffect(() => {
    if (expense) {
      const category = categories.find(c => c.id === expense.categoryId);
      const title = category ? `${expense.description}  •  ${category.emoji}` : expense.description;
      navigation.setOptions({
        title,
      });
    }
  }, [expense, categories, navigation]);

  // Map participant IDs to names
  const participantMap = useMemo(() => {
    const map = new Map<string, string>();
    participants.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [participants]);

  // Compute per-participant portions in trip currency minor units
  const splitPortions = useMemo(() => {
    if (!expense) return new Map<string, number>();

    const totalAmount = expense.convertedAmountMinor;
    const equalCount = splits.filter((s) => s.shareType === 'equal').length || 1;
    const totalWeight = splits
      .filter((s) => s.shareType === 'weight')
      .reduce((sum, s) => sum + s.share, 0);

    const portions = new Map<string, number>();

    splits.forEach((split) => {
      let portion: number | null = null;

      if (split.shareType === 'amount' && split.amount != null) {
        portion = split.amount;
      } else if (split.shareType === 'percentage') {
        portion = Math.round((split.share / 100) * totalAmount);
      } else if (split.shareType === 'weight') {
        if (totalWeight > 0) {
          portion = Math.round((split.share / totalWeight) * totalAmount);
        }
      } else if (split.shareType === 'equal') {
        portion = Math.round(totalAmount / equalCount);
      }

      if (portion != null) {
        portions.set(split.participantId, portion);
      }
    });

    return portions;
  }, [expense, splits]);

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
      currencyLogger.warn('Failed to convert to display currency', error);
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
            onPress={() => router.replace(`/trips/${tripId}/expenses`)}
          />
        </View>
      </View>
    );
  }

  const paidByName = participantMap.get(expense.paidBy) || 'Unknown';
  const category = categories.find(c => c.id === expense.categoryId);
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
            setIsDeleting(true);
            try {
              await deleteExpense(expenseId);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete expense');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
      >
        {/* Main Expense Info */}
        <Card style={styles.section}>
          <View style={styles.header}>
            <Text style={styles.sectionTitle}>{expense.description}</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={() => router.push(`/trips/${tripId}/expenses/${expenseId}/edit`)}
                style={styles.editButton}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Edit expense"
                accessibilityHint="Opens the edit expense screen"
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditingExpense(!editingExpense)}
                style={[styles.editButton, editingExpense && styles.deleteButtonActive]}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={editingExpense ? "Cancel delete" : "Delete expense"}
                accessibilityHint={editingExpense ? "Hides the delete option" : "Shows the delete option"}
              >
                <Text style={[styles.editButtonText, editingExpense && styles.deleteButtonTextActive]}>
                  {editingExpense ? 'Cancel' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

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
              const portion = splitPortions.get(split.participantId);
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
                    {portion !== undefined && (
                      <>
                        <Text style={styles.splitAmount}>
                          {formatCurrency(portion, expense.currency)}
                        </Text>
                        {showDisplayCurrency && displayAmounts && (
                          <Text style={styles.displayAmountSmall}>
                            {formatCurrency(
                              Math.round(portion * displayAmounts.fxRate),
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

        {/* Danger Zone - Only show when editing */}
        {editingExpense && (
          <Card style={styles.deleteCard}>
            <Text style={styles.deleteWarning}>Danger Zone</Text>
            <Text style={styles.deleteDescription}>
              Deleting this expense will permanently remove it and all its split data. This action cannot be undone.
            </Text>
            <Button
              title={isDeleting ? 'Deleting...' : 'Delete Expense'}
              onPress={handleDelete}
              fullWidth
              disabled={isDeleting}
            />
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

function normalizeRouteParam(param: string | string[] | undefined) {
  if (!param) return null;
  const value = Array.isArray(param) ? param[0] : param;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  editButton: {
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editButtonText: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.primary,
  },
  deleteButtonActive: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  deleteButtonTextActive: {
    color: theme.colors.text,
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
    marginRight: theme.spacing.md,
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
    minWidth: 120,
    flexShrink: 0,
  },
  splitAmount: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    textAlign: 'right',
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
  deleteCard: {
    backgroundColor: '#1a0000',
    borderColor: theme.colors.error,
    borderWidth: 2,
  },
  deleteWarning: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  deleteDescription: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
    textAlign: 'center',
  },
});
