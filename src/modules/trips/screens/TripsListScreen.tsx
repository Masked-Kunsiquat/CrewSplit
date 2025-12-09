/**
 * TRIPS MODULE - Trips List Screen
 * UI/UX ENGINEER: Main screen showing all trips
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Card } from '@ui/components';

export default function TripsListScreen() {
  const router = useRouter();

  // Mock data - will be replaced with real data from repository
  const mockTrips = [
    { id: '1', name: 'Weekend Getaway', participants: 4, totalExpenses: 32500 },
    { id: '2', name: 'Summer Vacation', participants: 6, totalExpenses: 125000 },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>My Trips</Text>

        {mockTrips.map((trip) => (
          <Card
            key={trip.id}
            style={styles.tripCard}
            onPress={() => router.push(`/trips/${trip.id}`)}
          >
            <Text style={styles.tripName}>{trip.name}</Text>
            <View style={styles.tripMeta}>
              <Text style={styles.metaText}>{trip.participants} participants</Text>
              <Text style={styles.metaText}>
                ${(trip.totalExpenses / 100).toFixed(2)}
              </Text>
            </View>
          </Card>
        ))}

        {mockTrips.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No trips yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first trip to start tracking expenses
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Create New Trip"
          onPress={() => router.push('/trips/create')}
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
  tripCard: {
    marginBottom: theme.spacing.md,
  },
  tripName: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  tripMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
  },
  emptyText: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.typography.base,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
