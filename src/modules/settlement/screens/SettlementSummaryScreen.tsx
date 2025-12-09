/**
 * SETTLEMENT MODULE - Settlement Summary Screen
 * UI/UX ENGINEER: Show who owes whom and settlement transactions
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { theme } from '@ui/theme';
import { Card, Button } from '@ui/components';

export default function SettlementSummaryScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();

  // Mock data - will be calculated using settlement module in Step 5
  const mockBalances = [
    { participant: 'Alice', netPosition: 5000, totalPaid: 26500, totalOwed: 21500 },
    { participant: 'Bob', netPosition: -2000, totalPaid: 6000, totalOwed: 8000 },
    { participant: 'Charlie', netPosition: -3000, totalPaid: 0, totalOwed: 3000 },
  ];

  const mockSettlements = [
    { from: 'Charlie', to: 'Alice', amount: 3000 },
    { from: 'Bob', to: 'Alice', amount: 2000 },
  ];

  const formatCurrency = (cents: number) => {
    return `$${(Math.abs(cents) / 100).toFixed(2)}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settlement Summary</Text>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Balances</Text>
          {mockBalances.map((balance, index) => (
            <View key={index} style={styles.balanceRow}>
              <View style={styles.balanceInfo}>
                <Text style={styles.participantName}>{balance.participant}</Text>
                <Text style={styles.balanceDetail}>
                  Paid: {formatCurrency(balance.totalPaid)} |
                  Owes: {formatCurrency(balance.totalOwed)}
                </Text>
              </View>
              <View style={styles.netPosition}>
                {balance.netPosition > 0 ? (
                  <Text style={styles.positiveBalance}>
                    +{formatCurrency(balance.netPosition)}
                  </Text>
                ) : balance.netPosition < 0 ? (
                  <Text style={styles.negativeBalance}>
                    -{formatCurrency(balance.netPosition)}
                  </Text>
                ) : (
                  <Text style={styles.zeroBalance}>Settled</Text>
                )}
              </View>
            </View>
          ))}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested Payments</Text>
          <Text style={styles.sectionSubtitle}>
            To settle all debts with minimum transactions:
          </Text>

          {mockSettlements.map((settlement, index) => (
            <View key={index} style={styles.settlementRow}>
              <View style={styles.settlementContent}>
                <Text style={styles.settlementText}>
                  <Text style={styles.settlementFrom}>{settlement.from}</Text>
                  <Text style={styles.settlementArrow}> → </Text>
                  <Text style={styles.settlementTo}>{settlement.to}</Text>
                </Text>
                <Text style={styles.settlementAmount}>
                  {formatCurrency(settlement.amount)}
                </Text>
              </View>
            </View>
          ))}

          {mockSettlements.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>All settled up!</Text>
              <Text style={styles.emptySubtext}>
                Everyone has been paid back
              </Text>
            </View>
          )}
        </Card>

        <Text style={styles.helper}>
          These suggestions minimize the number of transactions needed to settle all debts.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Export Summary"
          variant="outline"
          onPress={() => {/* TODO: Export to CSV/PDF */}}
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
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  sectionSubtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  balanceInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  balanceDetail: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  netPosition: {
    alignItems: 'flex-end',
  },
  positiveBalance: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.success,
  },
  negativeBalance: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.error,
  },
  zeroBalance: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.medium,
    color: theme.colors.textMuted,
  },
  settlementRow: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settlementContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settlementText: {
    flex: 1,
    fontSize: theme.typography.base,
  },
  settlementFrom: {
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  settlementArrow: {
    color: theme.colors.textMuted,
  },
  settlementTo: {
    fontWeight: theme.typography.semibold,
    color: theme.colors.primary,
  },
  settlementAmount: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.success,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  helper: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
