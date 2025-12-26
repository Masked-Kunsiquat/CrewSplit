/**
 * UI/UX ENGINEER: Manual FX Rate Entry Screen
 * Allows users to manually set exchange rates when API rates are unavailable
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { theme } from "@ui/theme";
import { Button, Input, Card, ConfirmDialog } from "@ui/components";
import { CurrencyPicker } from "@ui/components/CurrencyPicker";
import { useFxRateProvider } from "../context/FxRateContext";
import { formatFxRate, formatMajorAmount } from "@utils/formatting";

// Configurable threshold for warning about unusually high exchange rates
// Set high enough to accommodate currencies like KRW, VND, IDR (e.g., 1 USD = 15000+ KRW)
const UNREALISTIC_RATE_THRESHOLD = 50000;

export default function ManualRateEntryScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const fxRateProvider = useFxRateProvider();
  const params = useLocalSearchParams<{
    fromCurrency?: string;
    toCurrency?: string;
  }>();

  // Set header title
  useEffect(() => {
    navigation.setOptions({
      title: "Set Exchange Rate",
    });
  }, [navigation]);

  // Form state
  const [fromCurrency, setFromCurrency] = useState<string | null>(
    params.fromCurrency ?? null,
  );
  const [toCurrency, setToCurrency] = useState<string | null>(
    params.toCurrency ?? null,
  );
  const [rate, setRate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showRateConfirm, setShowRateConfirm] = useState(false);

  // Validation
  const rateNum = parseFloat(rate);
  const isValidRate = rate.trim().length > 0 && !isNaN(rateNum) && rateNum > 0;
  const canSubmit =
    fromCurrency &&
    toCurrency &&
    fromCurrency !== toCurrency &&
    isValidRate &&
    !isSaving;

  const handleSave = async () => {
    if (!fromCurrency || !toCurrency || !isValidRate) {
      Alert.alert("Invalid Input", "Please fill in all fields correctly.");
      return;
    }

    if (fromCurrency === toCurrency) {
      Alert.alert(
        "Invalid Currencies",
        "Source and target currencies cannot be the same.",
      );
      return;
    }

    // Warn if rate seems unrealistic (threshold accounts for high-value currencies like KRW, VND, IDR)
    if (rateNum > UNREALISTIC_RATE_THRESHOLD) {
      setShowRateConfirm(true);
      return;
    }

    await saveRate();
  };

  const saveRate = async () => {
    if (!fromCurrency || !toCurrency || !isValidRate) return;

    setIsSaving(true);
    try {
      await fxRateProvider.setManualRate(fromCurrency, toCurrency, rateNum);

      Alert.alert(
        "Rate Saved",
        `Exchange rate saved: ${fromCurrency} → ${toCurrency} = ${rateNum}`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to save exchange rate. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={theme.commonStyles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Manual rates override automatic rates and are useful when internet
            access is limited or for custom conversion needs.
          </Text>
        </Card>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Currency Pair</Text>
          <Text style={styles.sectionHelper}>
            Select the currencies you want to convert between
          </Text>

          <CurrencyPicker
            label="From Currency"
            value={fromCurrency}
            onChange={setFromCurrency}
            placeholder="Select source currency"
          />

          <CurrencyPicker
            label="To Currency"
            value={toCurrency}
            onChange={setToCurrency}
            placeholder="Select target currency"
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Exchange Rate</Text>
          <Text style={styles.sectionHelper}>
            {fromCurrency && toCurrency
              ? `How many ${toCurrency} per 1 ${fromCurrency}?`
              : "Enter the exchange rate"}
          </Text>

          <Input
            label={
              fromCurrency && toCurrency
                ? `Rate (1 ${fromCurrency} = ? ${toCurrency})`
                : "Rate"
            }
            placeholder="e.g., 0.92"
            value={rate}
            onChangeText={setRate}
            keyboardType="decimal-pad"
            editable={!isSaving}
            error={
              rate.trim().length > 0 && !isValidRate
                ? "Rate must be a positive number"
                : undefined
            }
          />
        </View>

        {fromCurrency && toCurrency && isValidRate && (
          <Card style={styles.previewCard}>
            <Text style={styles.previewTitle}>Preview</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>1 {fromCurrency}</Text>
              <Text style={styles.previewEquals}>=</Text>
              <Text style={styles.previewValue}>
                {formatFxRate(rateNum)} {toCurrency}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>100 {fromCurrency}</Text>
              <Text style={styles.previewEquals}>=</Text>
              <Text style={styles.previewValue}>
                {formatMajorAmount(rateNum * 100)} {toCurrency}
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>

      <View style={theme.commonStyles.footer}>
        <Button
          title="Cancel"
          variant="outline"
          onPress={() => router.back()}
          fullWidth
          disabled={isSaving}
        />
        <View style={{ height: theme.spacing.md }} />
        <Button
          title={isSaving ? "Saving..." : "Save Rate"}
          onPress={handleSave}
          fullWidth
          disabled={!canSubmit}
        />
      </View>

      <ConfirmDialog
        visible={showRateConfirm}
        title="Confirm Rate"
        message={`The exchange rate ${rateNum} seems unusually high. Are you sure this is correct?`}
        confirmLabel="Continue"
        onCancel={() => setShowRateConfirm(false)}
        onConfirm={() => {
          setShowRateConfirm(false);
          saveRate();
        }}
        loading={isSaving}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
  },
  infoIcon: {
    fontSize: theme.typography.xl,
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  formSection: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  sectionHelper: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
    marginTop: -theme.spacing.sm,
  },
  previewCard: {
    backgroundColor: theme.colors.surfaceElevated,
    gap: theme.spacing.md,
  },
  previewTitle: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textSecondary,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  previewLabel: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    flex: 1,
  },
  previewEquals: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
  },
  previewValue: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.primary,
    flex: 1,
    textAlign: "right",
  },
});
