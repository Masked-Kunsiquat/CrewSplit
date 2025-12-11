import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Card } from '@ui/components';
import { useTrips } from '../hooks/use-trips';

export default function TripsListScreen() {
  const router = useRouter();
  const { trips, loading, error } = useTrips();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Trips</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}

        {error && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        )}

        {!loading && !error && trips.length === 0 && (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptyText}>
              Create your first trip to start tracking shared expenses with your crew.
            </Text>
          </Card>
        )}

        {!loading && trips.map((trip) => (
          <Card
            key={trip.id}
            style={styles.tripCard}
            onPress={() => router.push(`/trips/${trip.id}`)}
          >
            <Text style={styles.tripName}>{trip.name}</Text>
            <Text style={styles.tripMeta}>{trip.currency} • {new Date(trip.startDate).toLocaleDateString()}</Text>
          </Card>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Create Trip"
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
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.xxxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  settingsButton: {
    padding: theme.spacing.sm,
  },
  settingsIcon: {
    fontSize: 24,
    color: theme.colors.textSecondary,
  },
  centerContent: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorCard: {
    backgroundColor: theme.colors.error,
  },
  errorText: {
    fontSize: theme.typography.base,
    color: theme.colors.background,
  },
  emptyCard: {
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderWidth: 1,
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  tripCard: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  tripName: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  tripMeta: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
