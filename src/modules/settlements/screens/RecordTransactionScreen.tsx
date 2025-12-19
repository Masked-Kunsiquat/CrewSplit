/**
 * SETTLEMENTS MODULE - Record Transaction Screen
 * UI/UX ENGINEER: Screen for recording settlement payments between participants
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { theme } from "@ui/theme";
import {
  Button,
  Input,
  DatePicker,
  Picker,
  PickerOption,
} from "@ui/components";
import { useTripById } from "../../trips/hooks/use-trips";
import { useParticipants } from "../../participants/hooks/use-participants";
import { useCreateSettlement } from "../hooks/use-settlements";
import { parseCurrency } from "@utils/currency";
import type { NewSettlementData, SettlementPaymentMethod } from "../types";

export default function RecordTransactionScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{
    id?: string | string[];
    fromParticipantId?: string;
    toParticipantId?: string;
    amount?: string;
    expenseSplitId?: string;
  }>();

  // Extract tripId from route parameter [id]
  const tripId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { trip, loading: tripLoading } = useTripById(tripId ?? null);
  const { participants, loading: participantsLoading } = useParticipants(
    tripId ?? null,
  );
  const {
    createSettlement,
    loading: creating,
    error: createError,
  } = useCreateSettlement();

  // Form state
  const [amount, setAmount] = useState(params.amount ?? "");
  const [currency, setCurrency] = useState<string>("");
  const [fromParticipantId, setFromParticipantId] = useState<string | null>(
    params.fromParticipantId ?? null,
  );
  const [toParticipantId, setToParticipantId] = useState<string | null>(
    params.toParticipantId ?? null,
  );
  const [date, setDate] = useState(new Date());
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<SettlementPaymentMethod | null>(null);

  // Set default currency from trip
  useEffect(() => {
    if (trip && !currency) {
      setCurrency(trip.currencyCode);
    }
  }, [trip, currency]);

  // Update header title
  useEffect(() => {
    if (trip) {
      navigation.setOptions({
        title: `Record Payment - ${trip.name}`,
      });
    }
  }, [trip, navigation]);

  const handleSave = async () => {
    if (!tripId || !fromParticipantId || !toParticipantId) {
      Alert.alert("Error", "Please select both payer and payee");
      return;
    }

    if (fromParticipantId === toParticipantId) {
      Alert.alert("Error", "Payer and payee must be different");
      return;
    }

    const parsedAmount = parseCurrency(amount);
    if (parsedAmount <= 0) {
      Alert.alert("Error", "Amount must be greater than zero");
      return;
    }

    if (!currency) {
      Alert.alert("Error", "Please select a currency");
      return;
    }

    try {
      const settlementData: NewSettlementData = {
        tripId,
        fromParticipantId,
        toParticipantId,
        originalAmountMinor: parsedAmount,
        originalCurrency: currency,
        date: date.toISOString(),
        description: description.trim() || undefined,
        paymentMethod: paymentMethod || undefined,
        expenseSplitId: params.expenseSplitId,
      };

      await createSettlement(settlementData);

      Alert.alert("Success", "Payment recorded successfully", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Failed to create settlement:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Error", `Failed to record payment: ${errorMessage}`);
    }
  };

  if (tripLoading || participantsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>Trip Not Found</Text>
          <Text style={styles.errorText}>
            The trip could not be loaded. Please try again.
          </Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  if (participants.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>No Participants</Text>
          <Text style={styles.errorText}>
            Add participants to the trip before recording payments.
          </Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const participantOptions: PickerOption[] = participants.map((p) => ({
    label: p.name,
    value: p.id,
  }));

  const commonCurrencies = ["USD", "EUR", "GBP", "CAD", "AUD"];
  const currencyOptions: PickerOption[] = [
    { label: `${trip.currencyCode} (Trip Currency)`, value: trip.currencyCode },
    ...commonCurrencies
      .filter((code) => code !== trip.currencyCode)
      .map((code) => ({ label: code, value: code })),
  ];

  const paymentMethodOptions: PickerOption<SettlementPaymentMethod>[] = [
    { label: "Bank Transfer", value: "bank_transfer" },
    { label: "Cash", value: "cash" },
    { label: "Check", value: "check" },
    { label: "Other", value: "other" },
    { label: "PayPal", value: "paypal" },
    { label: "Venmo", value: "venmo" },
    { label: "Zelle", value: "zelle" },
  ];

  const validPaymentMethods = new Set<string>(
    paymentMethodOptions.map((option) => option.value),
  );

  const isSettlementPaymentMethod = (
    value: string,
  ): value is SettlementPaymentMethod => validPaymentMethods.has(value);

  const handlePaymentMethodChange = (value: SettlementPaymentMethod | "") => {
    if (!value) {
      setPaymentMethod(null);
      return;
    }

    if (isSettlementPaymentMethod(value)) {
      setPaymentMethod(value);
      return;
    }

    console.warn("Ignoring unknown payment method value", value);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amount</Text>
          <View style={styles.amountRow}>
            <View style={styles.amountInputWrapper}>
              <Input
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
            <View style={styles.currencyPickerWrapper}>
              <Picker
                value={currency}
                onChange={(value: string) => setCurrency(value)}
                options={currencyOptions}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>From (Payer)</Text>
          <Picker
            value={fromParticipantId || ""}
            onChange={(value: string) => setFromParticipantId(value || null)}
            options={participantOptions}
            placeholder="Select payer"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>To (Payee)</Text>
          <Picker
            value={toParticipantId || ""}
            onChange={(value: string) => setToParticipantId(value || null)}
            options={participantOptions}
            placeholder="Select payee"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date</Text>
          <DatePicker
            value={date}
            onChange={setDate}
            maximumDate={new Date()}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method (Optional)</Text>
          <Picker<SettlementPaymentMethod | "">
            value={paymentMethod || ""}
            onChange={handlePaymentMethodChange}
            options={paymentMethodOptions}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Note (Optional)</Text>
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="e.g., Venmo payment for dinner"
            multiline
            numberOfLines={3}
          />
        </View>

        {createError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{createError.message}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Cancel"
          onPress={() => router.back()}
          variant="secondary"
          fullWidth
        />
        <Button
          title={creating ? "Saving..." : "Save Payment"}
          onPress={handleSave}
          disabled={creating}
          fullWidth
        />
      </View>
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.base,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  amountRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  amountInputWrapper: {
    flex: 2,
  },
  currencyPickerWrapper: {
    flex: 1,
  },
  errorContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.error + "20",
    borderRadius: 8,
    marginBottom: theme.spacing.md,
  },
  footer: {
    flexDirection: "row",
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
});
