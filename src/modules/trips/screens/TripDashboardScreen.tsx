/**
 * TRIPS MODULE - Trip Dashboard Screen
 * UI/UX ENGINEER: Main dashboard for a single trip
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Card } from '@ui/components';

export default function TripDashboardScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Mock data - will be replaced with real data from repository
  const mockTrip = {
    id,
    name: 'Weekend Getaway',
    participantCount: 4,
    expenseCount: 12,
    totalAmount: 32500,
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{mockTrip.name}</Text>

        <View style={styles.stats}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{mockTrip.participantCount}</Text>
            <Text style={styles.statLabel}>Participants</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{mockTrip.expenseCount}</Text>
            <Text style={styles.statLabel}>Expenses</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>
              ${(mockTrip.totalAmount / 100).toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Total</Text>
          </Card>
        </View>

        <View style={styles.actions}>
          <Card
            style={styles.actionCard}
            onPress={() => router.push(`/trips/${id}/participants`)}
          >
            <Text style={styles.actionTitle}>Manage Participants</Text>
            <Text style={styles.actionSubtitle}>Add or remove people</Text>
          </Card>

          <Card
            style={styles.actionCard}
            onPress={() => router.push(`/trips/${id}/expenses`)}
          >
            <Text style={styles.actionTitle}>View Expenses</Text>
            <Text style={styles.actionSubtitle}>See all trip expenses</Text>
          </Card>

          <Card
            style={styles.actionCard}
            onPress={() => router.push(`/trips/${id}/settlement`)}
          >
            <Text style={styles.actionTitle}>Settle Up</Text>
            <Text style={styles.actionSubtitle}>See who owes whom</Text>
          </Card>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Add Expense"
          onPress={() => router.push(`/trips/${id}/expenses/add`)}
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
  },
  title: {
    fontSize: theme.typography.xxxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  stats: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.xxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  actions: {
    gap: theme.spacing.md,
  },
  actionCard: {
    marginBottom: 0,
  },
  actionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  actionSubtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
