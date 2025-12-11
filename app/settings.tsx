/**
 * UI/UX ENGINEER: Settings Screen
 * Global app settings including display currency preference
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@ui/theme';
import { Card, CurrencyPicker, Button } from '@ui/components';
import { useDisplayCurrency } from '@hooks/use-display-currency';

export default function SettingsScreen() {
  const router = useRouter();
  const { displayCurrency, loading, setDisplayCurrency, clearPreference } =
    useDisplayCurrency();

  const handleCurrencyChange = async (currency: string | null) => {
    try {
      await setDisplayCurrency(currency);
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to save display currency preference. Please try again.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Display Currency</Text>
          <Text style={styles.sectionDescription}>
            Choose a currency to display amounts alongside the trip currency. This is for
            reference only and does not affect calculations.
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
                💡 Display currency conversions are shown in italics as a visual reference.
                All settlement calculations use the trip currency.
              </Text>
            </Card>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>About CrewSplit</Text>
          <Text style={styles.aboutText}>
            A deterministic, family-focused trip expense-splitting app.
          </Text>
          <Text style={styles.aboutText}>
            All calculations are auditable and reproducible, with no hidden business logic.
          </Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Back to Home"
          variant="outline"
          onPress={() => router.push('/')}
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
});
