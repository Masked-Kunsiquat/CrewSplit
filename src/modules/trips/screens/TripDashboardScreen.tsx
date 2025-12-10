import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Card } from '@ui/components';

export default function TripDashboardScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Trip Dashboard</Text>
        <Text style={styles.subtitle}>Trip ID: {id}</Text>

        <Card style={styles.placeholderCard}>
          <Text style={styles.eyebrow}>Coming soon</Text>
          <Text style={styles.placeholderText}>
            Trip health, quick stats, and settlement prompts will live here once data and math
            engines plug in.
          </Text>
        </Card>

        <View style={styles.actionGrid}>
          <Card style={styles.actionCard} onPress={() => router.push(`/trips/${id}/participants`)}>
            <Text style={styles.actionTitle}>Participants</Text>
            <Text style={styles.actionBody}>Tap to add family members and toggle them into splits.</Text>
          </Card>

          <Card style={styles.actionCard} onPress={() => router.push(`/trips/${id}/expenses`)}>
            <Text style={styles.actionTitle}>Expenses</Text>
            <Text style={styles.actionBody}>Review the placeholder list before wiring to SQLite.</Text>
          </Card>

          <Card style={styles.actionCard} onPress={() => router.push(`/trips/${id}/settlement`)}>
            <Text style={styles.actionTitle}>Settlement</Text>
            <Text style={styles.actionBody}>See the mock flows for who owes whom.</Text>
          </Card>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Add Expense" onPress={() => router.push(`/trips/${id}/expenses/add`)} fullWidth />
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
  },
  subtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  placeholderCard: {
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  eyebrow: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  placeholderText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
  },
  actionGrid: {
    gap: theme.spacing.md,
  },
  actionCard: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  actionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  actionBody: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
