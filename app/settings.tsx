/**
 * UI/UX ENGINEER: Settings Screen
 * Global app settings including display currency preference
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { Image } from "expo-image";
import { theme } from "@ui/theme";
import { Card, CurrencyPicker, Button, Input } from "@ui/components";
import { useDisplayCurrency } from "@hooks/use-display-currency";
import { useDeviceOwner } from "@hooks/use-device-owner";
import { useFxRates } from "@modules/fx-rates/hooks/use-fx-rates";
import { useOnboardingState } from "@modules/onboarding/hooks/use-onboarding-state";
import { useReloadSampleData } from "@modules/onboarding/hooks/use-sample-data";

/**
 * Format timestamp as relative time (e.g., "2 days ago")
 */
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

/**
 * Renders the Settings screen UI for managing app-wide preferences and utilities.
 *
 * Displays and allows editing of device owner name, selection of a display currency,
 * inspection and navigation to exchange rate management, controls to restart onboarding
 * and refresh sample data, and app/about attribution details.
 *
 * @returns The JSX element for the Settings screen component.
 */
export default function SettingsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { displayCurrency, loading, setDisplayCurrency } = useDisplayCurrency();
  const {
    deviceOwnerName,
    loading: ownerLoading,
    setDeviceOwner,
  } = useDeviceOwner();
  const { rateCount, isStale, oldestUpdate } = useFxRates();
  const { loading: onboardingLoading, isComplete: onboardingComplete } =
    useOnboardingState();
  const {
    reloadSampleData,
    loading: sampleDataLoading,
    error: sampleDataError,
  } = useReloadSampleData();

  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);

  // Set header title
  useEffect(() => {
    navigation.setOptions({
      title: "Settings",
    });
  }, [navigation]);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const handleCurrencyChange = async (currency: string | null) => {
    try {
      await setDisplayCurrency(currency);
    } catch {
      Alert.alert(
        "Error",
        "Failed to save display currency preference. Please try again.",
      );
    }
  };

  const handleEditName = () => {
    setNameInput(deviceOwnerName || "");
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    try {
      await setDeviceOwner(nameInput.trim());
      setEditingName(false);
    } catch {
      Alert.alert("Error", "Failed to save your name. Please try again.");
    }
  };

  const handleCancelEdit = () => {
    setEditingName(false);
    setNameInput("");
  };

  const handleRestartOnboarding = useCallback(() => {
    router.push("/onboarding/walkthrough");
  }, [router]);

  const handleReloadSampleData = useCallback(() => {
    setShowRefreshConfirm(true);
  }, []);

  const confirmRefreshSamples = async () => {
    setShowRefreshConfirm(false);
    setActionMessage(null);
    try {
      const results = await reloadSampleData();
      const tripCount = results.length;
      setActionMessage(
        `Sample trips refreshed (${tripCount} loaded). Check your Trips list.`,
      );
    } catch (err) {
      console.error("Failed to refresh sample data", err);
      setActionMessage("Could not refresh sample data. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Your Name</Text>
          <Text style={styles.sectionDescription}>
            This identifies you as the device owner. You'll be automatically
            added to new trips.
          </Text>

          {!ownerLoading && (
            <>
              {editingName ? (
                <>
                  <Input
                    label="Your name"
                    placeholder="Enter your name"
                    value={nameInput}
                    onChangeText={setNameInput}
                    autoFocus
                  />
                  <View style={styles.buttonRow}>
                    <View style={styles.buttonHalf}>
                      <Button
                        title="Cancel"
                        variant="outline"
                        onPress={handleCancelEdit}
                        fullWidth
                      />
                    </View>
                    <View style={styles.buttonHalf}>
                      <Button title="Save" onPress={handleSaveName} fullWidth />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  {deviceOwnerName ? (
                    <>
                      <Text style={styles.deviceOwnerName}>
                        {deviceOwnerName}
                      </Text>
                      <Button
                        title="Change Name"
                        variant="outline"
                        onPress={handleEditName}
                        fullWidth
                      />
                    </>
                  ) : (
                    <Button
                      title="Set Your Name"
                      onPress={handleEditName}
                      fullWidth
                    />
                  )}
                </>
              )}
            </>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Display Currency</Text>
          <Text style={styles.sectionDescription}>
            Choose a currency to display amounts alongside the trip currency.
            This is for reference only and does not affect calculations.
          </Text>

          {!loading && (
            <CurrencyPicker
              value={displayCurrency}
              onChange={handleCurrencyChange}
              placeholder="None (use trip currency only)"
            />
          )}

          {displayCurrency && (
            <Card style={styles.infoCard}>
              <Text style={styles.infoText}>
                💡 Display currency conversions are shown in italics as a visual
                reference. All settlement calculations use the trip currency.
              </Text>
            </Card>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Exchange Rates</Text>
          <Text style={styles.sectionDescription}>
            Manage exchange rates for multi-currency trips. Rates are
            automatically updated from online sources when available.
          </Text>

          <View style={styles.ratesSummary}>
            <View style={styles.ratesSummaryRow}>
              <Text style={styles.ratesSummaryLabel}>Stored rates:</Text>
              <Text style={styles.ratesSummaryValue}>{rateCount}</Text>
            </View>
            {oldestUpdate && (
              <View style={styles.ratesSummaryRow}>
                <Text style={styles.ratesSummaryLabel}>Last updated:</Text>
                <Text
                  style={[
                    styles.ratesSummaryValue,
                    isStale && styles.ratesSummaryStale,
                  ]}
                >
                  {formatRelativeTime(oldestUpdate)}
                  {isStale && " ⚠️"}
                </Text>
              </View>
            )}
          </View>

          <Button
            title="Manage Exchange Rates"
            variant="outline"
            onPress={() => router.push({ pathname: "/fx-rates/" } as any)}
            fullWidth
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Onboarding & Sample Data</Text>
          <Text style={styles.sectionDescription}>
            Rerun onboarding or refresh the built-in sample trip for demos.
          </Text>

          <View style={styles.actionRow}>
            <Button
              title={
                onboardingLoading
                  ? "Opening..."
                  : onboardingComplete
                    ? "Replay Walkthrough"
                    : "Onboarding Incomplete"
              }
              variant="outline"
              onPress={handleRestartOnboarding}
              disabled={onboardingLoading}
              fullWidth
            />
            <Button
              title={
                sampleDataLoading ? "Refreshing..." : "Refresh Sample Trip"
              }
              onPress={handleReloadSampleData}
              disabled={sampleDataLoading}
              fullWidth
            />
          </View>

          {actionMessage && (
            <Text style={styles.helperText}>{actionMessage}</Text>
          )}
          {sampleDataError && (
            <Text style={styles.helperTextError}>
              {sampleDataError.message}
            </Text>
          )}
        </Card>

        <ConfirmDialog
          visible={showRefreshConfirm}
          title="Refresh sample trips?"
          message="Deletes existing sample trips and reloads all demo data."
          confirmLabel="Refresh"
          onCancel={() => setShowRefreshConfirm(false)}
          onConfirm={confirmRefreshSamples}
          loading={sampleDataLoading}
        />

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>About CrewSplit</Text>
          <Text style={styles.aboutText}>
            A deterministic, family-focused trip expense-splitting app.
          </Text>
          <Text style={styles.aboutText}>
            All calculations are auditable and reproducible, with no hidden
            business logic.
          </Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Attribution</Text>
          <Text style={styles.aboutText}>
            CrewSplit is powered by open tools and data sources:
          </Text>
          {[
            {
              name: "Drizzle ORM + SQLite",
              url: "https://orm.drizzle.team",
              icon: require("../assets/attribution/drizzle-orm.svg"),
              description: "Drizzle ORM + SQLite (offline-first)",
            },
            {
              name: "ExchangeRate-API",
              url: "https://www.exchangerate-api.com",
              icon: require("../assets/attribution/exchangerate-api.svg"),
              description: "Exchange rates by ExchangeRate-API",
            },
            {
              name: "Expo & React Native",
              url: "https://expo.dev",
              icon: require("../assets/attribution/expo-go-app.svg"),
              description: "Expo & React Native",
            },
            {
              name: "Frankfurter API",
              url: "https://www.frankfurter.app",
              icon: require("../assets/attribution/frankfurter-api.svg"),
              description: "Frankfurter API (ECB reference rates)",
            },
          ].map((item) => (
            <View key={item.name} style={styles.attributionRow}>
              <Image
                source={item.icon}
                style={styles.attributionIcon}
                contentFit="contain"
                accessibilityLabel={`${item.name} logo`}
              />
              <Text
                style={styles.linkText}
                onPress={() => Linking.openURL(item.url)}
                accessible
                accessibilityRole="link"
                accessibilityLabel={item.name}
              >
                {item.description}
              </Text>
            </View>
          ))}
        </Card>
      </ScrollView>
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
    gap: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.xxxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  section: {
    backgroundColor: theme.colors.surfaceElevated,
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  sectionDescription: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  deviceOwnerName: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    textAlign: "center",
    paddingVertical: theme.spacing.md,
  },
  buttonRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  buttonHalf: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
  },
  infoText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  aboutText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    lineHeight: 22,
  },
  linkText: {
    fontSize: theme.typography.base,
    color: theme.colors.primary,
    lineHeight: 22,
    textDecorationLine: "underline",
    flexShrink: 1,
    flexWrap: "wrap",
  },
  attributionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  attributionIcon: {
    width: 24,
    height: 24,
  },
  versionText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  ratesSummary: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  ratesSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratesSummaryLabel: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  ratesSummaryValue: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  ratesSummaryStale: {
    color: theme.colors.warning,
  },
  actionRow: {
    gap: theme.spacing.sm,
  },
  helperText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    lineHeight: 18,
  },
  helperTextError: {
    marginTop: theme.spacing.xs,
    color: theme.colors.error,
    fontSize: theme.typography.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.lg,
  },
  modalTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  modalMessage: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  modalActions: {
    gap: theme.spacing.sm,
  },
});

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

/**
 * Renders a modal confirmation dialog with Cancel and confirm actions.
 *
 * @param confirmLabel - Text for the confirm button when not loading
 * @param onCancel - Called when the dialog is dismissed or the Cancel action is pressed
 * @param onConfirm - Called when the confirm action is pressed
 * @param loading - When `true`, disables the confirm button and shows a working label
 * @returns The confirmation dialog element to render in the component tree
 */
function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
  loading,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onCancel} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={onCancel}
              fullWidth
            />
            <Button
              title={loading ? "Working..." : confirmLabel}
              onPress={onConfirm}
              fullWidth
              disabled={loading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}