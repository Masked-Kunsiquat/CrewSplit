/**
 * SETTLEMENTS MODULE - Transaction Row Component
 * UI/UX ENGINEER: Display a single settlement transaction in a list
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
// @ts-expect-error @expo/vector-icons lacks TypeScript definitions
import { MaterialCommunityIcons } from "@expo/vector-icons";
// @ts-expect-error @expo/vector-icons lacks TypeScript definitions
import { Entypo } from "@expo/vector-icons";
// @ts-expect-error @expo/vector-icons lacks TypeScript definitions
import { Ionicons } from "@expo/vector-icons";
// @ts-expect-error @expo/vector-icons lacks TypeScript definitions
import { FontAwesome6 } from "@expo/vector-icons";
import { theme } from "@ui/theme";
import { formatCurrency } from "@utils/currency";
import type { SettlementWithParticipants } from "../types";

interface TransactionRowProps {
  settlement: SettlementWithParticipants;
  onPress?: () => void;
  onLongPress?: () => void;
  showDate?: boolean;
}

export function TransactionRow({
  settlement,
  onPress,
  onLongPress,
  showDate = true,
}: TransactionRowProps) {
  const formattedDate = new Date(settlement.date).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
    },
  );
  const paymentBadge = getPaymentBadge(settlement.paymentMethod);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`Payment from ${settlement.fromParticipantName} to ${settlement.toParticipantName}, ${formatCurrency(settlement.originalAmountMinor, settlement.originalCurrency)} ${settlement.originalCurrency}`}
    >
      {paymentBadge && <View style={styles.paymentBadge}>{paymentBadge}</View>}
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
          {formatCurrency(
            settlement.originalAmountMinor,
            settlement.originalCurrency,
          )}
        </Text>
      </View>
    </Pressable>
  );
}

function getPaymentBadge(paymentMethod: string | null) {
  if (!paymentMethod) return null;

  switch (paymentMethod) {
    case "bank_transfer":
      return (
        <MaterialCommunityIcons
          name="bank"
          size={16}
          color={theme.colors.primary}
        />
      );
    case "cash":
      return (
        <MaterialCommunityIcons
          name="cash-fast"
          size={16}
          color={theme.colors.primary}
        />
      );
    case "check":
      return (
        <MaterialCommunityIcons
          name="checkbook"
          size={16}
          color={theme.colors.primary}
        />
      );
    case "paypal":
      return <Entypo name="paypal" size={16} color={theme.colors.primary} />;
    case "venmo":
      return (
        <Ionicons name="logo-venmo" size={16} color={theme.colors.primary} />
      );
    case "apple_pay":
      return (
        <FontAwesome6 name="apple-pay" size={16} color={theme.colors.primary} />
      );
    case "zelle":
      return (
        <Image
          source={require("../../../../assets/payment-types/zelle.svg")}
          style={styles.paymentBadgeImage}
          contentFit="contain"
          tintColor={theme.colors.primary}
        />
      );
    case "cashapp":
      return (
        <Image
          source={require("../../../../assets/payment-types/cashapp.svg")}
          style={styles.paymentBadgeImage}
          contentFit="contain"
          tintColor={theme.colors.primary}
        />
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    position: "relative",
  },
  containerPressed: {
    opacity: 0.7,
    backgroundColor: theme.colors.surface,
  },
  leftContent: {
    flex: 1,
    marginRight: theme.spacing.md,
    flexShrink: 1,
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
    flexWrap: "wrap",
  },
  participantName: {
    fontSize: theme.typography.base,
    fontWeight: "600",
    color: theme.colors.text,
    flexShrink: 1,
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
    marginLeft: theme.spacing.sm,
  },
  amount: {
    fontSize: theme.typography.lg,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  paymentBadge: {
    position: "absolute",
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentBadgeImage: {
    width: 16,
    height: 16,
  },
});
