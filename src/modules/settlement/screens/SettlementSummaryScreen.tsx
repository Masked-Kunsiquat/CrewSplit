/**
 * UI/UX ENGINEER: Settlement Summary Screen
 * Displays participant balances and suggested payment transactions
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { theme } from '@ui/theme';
import { Card, Button } from '@ui/components';
import { useSettlementWithDisplay } from '../hooks/use-settlement-with-display';
import { useTripById } from '@modules/trips/hooks/use-trips';
import { useDisplayCurrency } from '@hooks/use-display-currency';
import { formatCurrency } from '@utils/currency';

export default function SettlementSummaryScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const tripId = normalizeTripId(params.id);
  const { displayCurrency } = useDisplayCurrency();

  const { trip } = useTripById(tripId);
  const { settlement, loading, error, refetch } = useSettlementWithDisplay(
    tripId ?? null,
    displayCurrency ?? undefined
  );

  // Update native header title
  useEffect(() => {
    if (trip) {
      navigation.setOptions({
        title: `${trip.name} - Settlement`,
      });
    }
  }, [trip, navigation]);

  if (!tripId) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>Invalid Trip</Text>
          <Text style={styles.errorText}>Missing trip id. Please select a trip.</Text>
          <Button title="Back to trips" onPress={() => navigation.navigate('index' as never)} />
        </View>
      </View>
    );
  }

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Calculating settlements...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>Error Loading Settlement</Text>
          <Text style={styles.errorText}>{formatErrorMessage(error)}</Text>
          <Button
            title="Retry"
            onPress={() => {
              if (refetch) {
                refetch();
              }
            }}
          />
        </View>
      </View>
    );
  }

  const hasSettlements = settlement.settlements.length > 0;
  const hasBalances = settlement.balances.length > 0;
  const showDisplayCurrency = !!settlement.displayCurrency;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.subtitle}>
            Total: {formatCurrency(settlement.totalExpenses, settlement.currency)}
          </Text>
          {showDisplayCurrency && settlement.displayTotalExpenses && (
            <Text style={styles.displayAmount}>
              {formatCurrency(
                settlement.displayTotalExpenses.displayAmount,
                settlement.displayTotalExpenses.displayCurrency
              )}
            </Text>
          )}
        </View>

        {/* Participant Balances Section */}
        {hasBalances && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Balances</Text>
            {settlement.balances.map((balance) => (
              <View key={balance.participantId} style={styles.balanceCard}>
                <Text style={styles.participantName}>{balance.participantName}</Text>

                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Paid:</Text>
                  <View style={styles.balanceAmounts}>
                    <Text style={styles.balanceAmount}>
                      {formatCurrency(balance.totalPaid, settlement.currency)}
                    </Text>
                    {showDisplayCurrency && balance.displayTotalPaid && (
                      <Text style={styles.displayAmountSmall}>
                        {formatCurrency(
                          balance.displayTotalPaid.displayAmount,
                          balance.displayTotalPaid.displayCurrency
                        )}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Owes:</Text>
                  <View style={styles.balanceAmounts}>
                    <Text style={styles.balanceAmount}>
                      {formatCurrency(balance.totalOwed, settlement.currency)}
                    </Text>
                    {showDisplayCurrency && balance.displayTotalOwed && (
                      <Text style={styles.displayAmountSmall}>
                        {formatCurrency(
                          balance.displayTotalOwed.displayAmount,
                          balance.displayTotalOwed.displayCurrency
                        )}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={[styles.balanceRow, styles.netRow]}>
                  <Text style={styles.netLabel}>Net:</Text>
                  <View style={styles.balanceAmounts}>
                    <Text
                      style={[
                        styles.netAmount,
                        balance.netPosition > 0 && styles.positiveAmount,
                        balance.netPosition < 0 && styles.negativeAmount,
                      ]}
                    >
                      {balance.netPosition > 0 ? '+' : ''}
                      {formatCurrency(balance.netPosition, settlement.currency)}
                    </Text>
                    {showDisplayCurrency && balance.displayNetPosition && (
                      <Text style={styles.displayAmountSmall}>
                        {balance.displayNetPosition.displayAmount > 0 ? '+' : ''}
                        {formatCurrency(
                          balance.displayNetPosition.displayAmount,
                          balance.displayNetPosition.displayCurrency
                        )}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Suggested Payments Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested Payments</Text>
          {hasSettlements ? (
            settlement.settlements.map((item, index) => (
              <View key={`${item.from}-${item.to}-${index}`} style={styles.settlementRow}>
                <Text style={styles.settlementText}>
                  <Text style={styles.from}>{item.fromName}</Text>
                  <Text style={styles.arrow}> → </Text>
                  <Text style={styles.to}>{item.toName}</Text>
                </Text>
                <View style={styles.settlementAmounts}>
                  <Text style={styles.amount}>
                    {formatCurrency(item.amount, settlement.currency)}
                  </Text>
                  {showDisplayCurrency && item.displayAmount && (
                    <Text style={styles.displayAmountSmall}>
                      {formatCurrency(
                        item.displayAmount.displayAmount,
                        item.displayAmount.displayCurrency
                      )}
                    </Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              {hasBalances
                ? 'No payments needed - everyone is settled up!'
                : 'No expenses yet. Add expenses to see settlements.'}
            </Text>
          )}
        </Card>

        {/* Audit Trail Info */}
        {hasBalances && (
          <Card style={styles.infoCard}>
            <Text style={styles.infoText}>
              All amounts are calculated from expense data using deterministic math.
              Net position shows how much each participant is owed (positive) or owes (negative).
            </Text>
          </Card>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Export Trip (Coming Soon)"
          variant="outline"
          fullWidth
          disabled
          accessibilityLabel="Export Trip coming soon"
          testID="export-trip-disabled"
        />
      </View>
    </View>
  );
}

function normalizeTripId(idParam: string | string[] | undefined) {
  if (!idParam) return null;
  const first = Array.isArray(idParam) ? idParam[0] : idParam;
  const normalized = first.trim();
  return normalized.length > 0 ? normalized : null;
}

function formatErrorMessage(error: unknown) {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') return maybeMessage;
  }
  return 'Unknown error';
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
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  displayAmount: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
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
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
  },
  sectionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  balanceCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    gap: theme.spacing.xs,
  },
  participantName: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  balanceAmounts: {
    alignItems: 'flex-end',
    gap: 2,
  },
  balanceAmount: {
    fontSize: theme.typography.sm,
    color: theme.colors.text,
  },
  displayAmountSmall: {
    fontSize: theme.typography.xs,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  netRow: {
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  netLabel: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  netAmount: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  positiveAmount: {
    color: theme.colors.success,
  },
  negativeAmount: {
    color: theme.colors.error,
  },
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settlementText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    flex: 1,
  },
  from: {
    fontWeight: theme.typography.semibold,
  },
  arrow: {
    color: theme.colors.textMuted,
  },
  to: {
    fontWeight: theme.typography.semibold,
    color: theme.colors.primary,
  },
  settlementAmounts: {
    alignItems: 'flex-end',
    marginLeft: theme.spacing.md,
    gap: 2,
  },
  amount: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
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
});
