import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Card } from '@ui/components';

export default function TripsListScreen() {
  const router = useRouter();

  // Mock trips to keep navigation deterministic until repositories land
  const mockTrips = [
    { id: 'trip-sample-1', name: 'Sample: Weekend Getaway' },
    { id: 'trip-sample-2', name: 'Sample: Family Road Trip' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Trips</Text>

        <Card style={styles.placeholderCard}>
          <Text style={styles.eyebrow}>Coming soon</Text>
          <Text style={styles.placeholderText}>
            Trip storage and syncing wire up here. For now, tap a mock trip to preview the flow.
          </Text>
        </Card>

        {mockTrips.map((trip) => (
          <Card
            key={trip.id}
            style={styles.tripCard}
            onPress={() => router.push(`/trips/${trip.id}`)}
          >
            <Text style={styles.tripName}>{trip.name}</Text>
            <Text style={styles.tripMeta}>Tap to open dashboard</Text>
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
  title: {
    fontSize: theme.typography.xxxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
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
