/**
 * UI COMPONENT - No Rate Available Modal
 * UI/UX ENGINEER: Modal for error recovery when exchange rate is missing
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { theme } from "@ui/theme";
import { Button } from "./Button";

export interface NoRateAvailableModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean;
  /**
   * Source currency code (e.g., "USD")
   */
  fromCurrency: string;
  /**
   * Target currency code (e.g., "EUR")
   */
  toCurrency: string;
  /**
   * Callback when user chooses to fetch online
   */
  onFetchOnline?: () => void;
  /**
   * Callback when user chooses to enter manually
   */
  onEnterManually?: () => void;
  /**
   * Callback when user dismisses the modal
   */
  onDismiss?: () => void;
  /**
   * Show loading state during fetch
   */
  fetching?: boolean;
}

/**
 * Modal component for handling missing exchange rates
 *
 * Provides two recovery options:
 * 1. Fetch rates from online API
 * 2. Enter rate manually
 *
 * @example
 * <NoRateAvailableModal
 *   visible={showModal}
 *   fromCurrency="JPY"
 *   toCurrency="USD"
 *   onFetchOnline={handleFetch}
 *   onEnterManually={handleManualEntry}
 *   onDismiss={handleDismiss}
 *   fetching={isFetching}
 * />
 */
export function NoRateAvailableModal({
  visible,
  fromCurrency,
  toCurrency,
  onFetchOnline,
  onEnterManually,
  onDismiss,
  fetching = false,
}: NoRateAvailableModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onDismiss} />

        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.icon}>🔄</Text>
            <Text style={styles.title}>Exchange Rate Needed</Text>
          </View>

          <View style={styles.body}>
            <View style={styles.currencyPair}>
              <Text style={styles.currency}>{fromCurrency}</Text>
              <Text style={styles.arrow}>→</Text>
              <Text style={styles.currency}>{toCurrency}</Text>
            </View>

            <Text style={styles.message}>
              No exchange rate is available for this currency pair. You can
              fetch the latest rates online or enter a custom rate manually.
            </Text>
          </View>

          {fetching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Fetching rates...</Text>
            </View>
          ) : (
            <View style={styles.actions}>
              {onFetchOnline && (
                <Button
                  title="Fetch Online"
                  onPress={onFetchOnline}
                  fullWidth
                  accessibilityLabel="Fetch exchange rates from internet"
                  accessibilityHint="Downloads latest rates from online API"
                />
              )}

              {onEnterManually && (
                <Button
                  title="Enter Manually"
                  variant="outline"
                  onPress={onEnterManually}
                  fullWidth
                  accessibilityLabel="Enter exchange rate manually"
                  accessibilityHint="Opens form to input custom rate"
                />
              )}

              {onDismiss && (
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={onDismiss}
                  fullWidth
                  accessibilityLabel="Cancel and close"
                />
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    width: "85%",
    maxWidth: 400,
    ...theme.shadows.lg,
  },
  header: {
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    textAlign: "center",
  },
  body: {
    gap: theme.spacing.md,
    alignItems: "center",
  },
  currencyPair: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  currency: {
    fontSize: theme.typography.xxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.primary,
  },
  arrow: {
    fontSize: theme.typography.xl,
    color: theme.colors.textMuted,
  },
  message: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  actions: {
    gap: theme.spacing.md,
  },
  loadingContainer: {
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },
  loadingText: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
  },
});
