/**
 * SETTLEMENTS MODULE - Balance Impact Card Component
 * UI/UX ENGINEER: Show how a transaction will affect participant balances
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "@ui/theme";
import { formatCurrency } from "@utils/currency";

interface BalanceChange {
  participantName: string;
  beforeBalance: number;
  afterBalance: number;
}

interface BalanceImpactCardProps {
  fromParticipant: BalanceChange;
  toParticipant: BalanceChange;
  amount: number;
  currency: string;
}

export function BalanceImpactCard({
  fromParticipant,
  toParticipant,
  amount,
  currency,
}: BalanceImpactCardProps) {
  const isOverpayment =
    fromParticipant.beforeBalance < 0 && fromParticipant.afterBalance > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Balance Impact</Text>
      <Text style={styles.subtitle}>
        Payment of {formatCurrency(amount, currency)}
      </Text>

      <View style={styles.changeRow}>
        <BalanceChangeItem
          name={fromParticipant.participantName}
          before={fromParticipant.beforeBalance}
          after={fromParticipant.afterBalance}
          currency={currency}
          label="Payer"
        />
      </View>

      <View style={styles.changeRow}>
        <BalanceChangeItem
          name={toParticipant.participantName}
          before={toParticipant.beforeBalance}
          after={toParticipant.afterBalance}
          currency={currency}
          label="Payee"
        />
      </View>

      {isOverpayment && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ This payment exceeds the suggested amount.{" "}
            {fromParticipant.participantName} will now be owed money.
          </Text>
        </View>
      )}
    </View>
  );
}

interface BalanceChangeItemProps {
  name: string;
  before: number;
  after: number;
  currency: string;
  label: string;
}

function BalanceChangeItem({
  name,
  before,
  after,
  currency,
  label,
}: BalanceChangeItemProps) {
  const formatBalance = (balance: number) => {
    const formatted = formatCurrency(Math.abs(balance), currency);
    if (balance > 0) return `+${formatted}`;
    if (balance < 0) return `-${formatted}`;
    return formatted;
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return theme.colors.success;
    if (balance < 0) return theme.colors.error;
    return theme.colors.textSecondary;
  };

  return (
    <View style={styles.changeItem}>
      <Text style={styles.changeLabel}>{label}</Text>
      <Text style={styles.changeName}>{name}</Text>
      <View style={styles.balanceRow}>
        <Text style={[styles.balance, { color: getBalanceColor(before) }]}>
          {formatBalance(before)}
        </Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={[styles.balance, { color: getBalanceColor(after) }]}>
          {formatBalance(after)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.lg,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  changeRow: {
    marginBottom: theme.spacing.md,
  },
  changeItem: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },
  changeLabel: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  changeName: {
    fontSize: theme.typography.base,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  balance: {
    fontSize: theme.typography.lg,
    fontWeight: "bold",
  },
  arrow: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
  },
  warningBox: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.warning + "20",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  warningText: {
    fontSize: theme.typography.sm,
    color: theme.colors.text,
  },
});
