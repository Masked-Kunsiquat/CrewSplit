/**
 * SETTLEMENTS MODULE - Transaction Details Screen
 * UI/UX ENGINEER: View and manage individual settlement transactions
 */

import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { theme } from "@ui/theme";
import { Button } from "@ui/components";
import {
  useSettlement,
  useDeleteSettlement,
} from "../hooks/use-settlements";
import { formatCents } from "@utils/currency";

export default function TransactionDetailsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id?: string }>();
  const settlementId = params.id;

  const { settlement, loading, refetch } = useSettlement(settlementId ?? null);
  const { deleteSettlement, loading: deleting } = useDeleteSettlement();

  useEffect(() => {
    if (settlement) {
      navigation.setOptions({
        title: "Payment Details",
      });
    }
  }, [settlement, navigation]);

  const handleDelete = () => {
    if (!settlement) return;

    Alert.alert(
      "Delete Payment",
      "Are you sure you want to delete this payment? This will adjust settlement balances.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSettlement(settlement.id);
              Alert.alert("Deleted", "Payment has been deleted", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (error) {
              console.error("Failed to delete settlement:", error);
              Alert.alert(
                "Error",
                "Failed to delete payment. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const handleEdit = () => {
    // Navigate to edit screen (would be similar to RecordTransactionScreen but in edit mode)
    Alert.alert("Edit", "Edit functionality coming soon");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }

  if (!settlement) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>Payment Not Found</Text>
          <Text style={styles.errorText}>
            This payment could not be loaded. It may have been deleted.
          </Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const showCurrencyConversion =
    settlement.originalCurrency !== settlement.originalCurrency; // TODO: Get trip currency

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Amount</Text>
        <Text style={styles.amountText}>
          {formatCents(settlement.originalAmountMinor)}{" "}
          {settlement.originalCurrency}
        </Text>
        {showCurrencyConversion && settlement.fxRateToTrip && (
          <Text style={styles.convertedText}>
            Converted: {formatCents(settlement.convertedAmountMinor)} (Rate:{" "}
            {settlement.fxRateToTrip.toFixed(4)})
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Direction</Text>
        <View style={styles.directionContainer}>
          <View style={styles.participantBox}>
            <Text style={styles.participantLabel}>From (Payer)</Text>
            <Text style={styles.participantName}>
              {settlement.fromParticipantName}
            </Text>
          </View>
          <Text style={styles.arrow}>→</Text>
          <View style={styles.participantBox}>
            <Text style={styles.participantLabel}>To (Payee)</Text>
            <Text style={styles.participantName}>
              {settlement.toParticipantName}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date</Text>
        <Text style={styles.detailText}>
          {new Date(settlement.date).toLocaleDateString()}
        </Text>
      </View>

      {settlement.paymentMethod && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <Text style={styles.detailText}>
            {settlement.paymentMethod.charAt(0).toUpperCase() +
              settlement.paymentMethod.slice(1).replace("_", " ")}
          </Text>
        </View>
      )}

      {settlement.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Note</Text>
          <Text style={styles.detailText}>{settlement.description}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Record Info</Text>
        <Text style={styles.metaText}>
          Created: {new Date(settlement.createdAt).toLocaleString()}
        </Text>
        {settlement.updatedAt !== settlement.createdAt && (
          <Text style={styles.metaText}>
            Last updated: {new Date(settlement.updatedAt).toLocaleString()}
          </Text>
        )}
      </View>

      <View style={styles.actionButtons}>
        <Button
          title="Edit"
          onPress={handleEdit}
          variant="secondary"
          style={styles.actionButton}
        />
        <Button
          title={deleting ? "Deleting..." : "Delete"}
          onPress={handleDelete}
          variant="danger"
          disabled={deleting}
          style={styles.actionButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  errorTitle: {
    fontSize: theme.typography.xl,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  content: {
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.sm,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  amountText: {
    fontSize: theme.typography["2xl"],
    fontWeight: "bold",
    color: theme.colors.text,
  },
  convertedText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  directionContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  participantBox: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  participantLabel: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  participantName: {
    fontSize: theme.typography.base,
    fontWeight: "600",
    color: theme.colors.text,
  },
  arrow: {
    fontSize: theme.typography.xl,
    color: theme.colors.textSecondary,
    marginHorizontal: theme.spacing.md,
  },
  detailText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
  },
  metaText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  actionButtons: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  actionButton: {
    flex: 1,
  },
});
