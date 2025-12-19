/**
 * SETTLEMENTS MODULE - Transaction Row Component
 * UI/UX ENGINEER: Display a single settlement transaction in a list
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { theme } from "@ui/theme";
import { formatCurrency } from "@utils/currency";
import type { SettlementWithParticipants } from "../types";

interface TransactionRowProps {
  settlement: SettlementWithParticipants;
  onPress?: () => void;
  showDate?: boolean;
}

export function TransactionRow({
  settlement,
  onPress,
  showDate = true,
}: TransactionRowProps) {
  const formattedDate = new Date(settlement.date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Payment from ${settlement.fromParticipantName} to ${settlement.toParticipantName}, ${formatCurrency(settlement.originalAmountMinor, settlement.originalCurrency)} ${settlement.originalCurrency}`}
    >
      <View style={styles.leftContent}>
        {showDate && <Text style={styles.date}>{formattedDate}</Text>}
        <View style={styles.participantsRow}>
          <Text style={styles.participantName}>
            {settlement.fromParticipantName}
          </Text>
          <Text style={styles.arrow}>→</Text>
          <Text style={styles.participantName}>
            {settlement.toParticipantName}
          </Text>
        </View>
        {settlement.description && (
          <Text style={styles.description} numberOfLines={1}>
            {settlement.description}
          </Text>
        )}
        {settlement.paymentMethod && (
          <Text style={styles.paymentMethod}>
            {settlement.paymentMethod.charAt(0).toUpperCase() +
              settlement.paymentMethod.slice(1).replace("_", " ")}
          </Text>
        )}
      </View>
      <View style={styles.rightContent}>
        <Text style={styles.amount}>
          {formatCurrency(settlement.originalAmountMinor, settlement.originalCurrency)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: theme.spacing.sm,
  },
  containerPressed: {
    opacity: 0.7,
    backgroundColor: theme.colors.surface,
  },
  leftContent: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  date: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  participantsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  participantName: {
    fontSize: theme.typography.base,
    fontWeight: "600",
    color: theme.colors.text,
  },
  arrow: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    marginHorizontal: theme.spacing.xs,
  },
  description: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    marginBottom: theme.spacing.xs,
  },
  paymentMethod: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
  },
  rightContent: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: theme.typography.lg,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
});
