/**
 * UI/UX ENGINEER: Trip Statistics Screen (Stubbed)
 *
 * This screen will eventually display trip insights and breakdowns including:
 * - Spending by category
 * - Spending over time
 * - Per-participant statistics
 * - Currency breakdown
 */

import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { theme } from "@ui/theme";
import { Card, LoadingScreen, ErrorScreen } from "@ui/components";
import { useTripById } from "../hooks/use-trips";
import { formatErrorMessage } from "src/utils/format-error";

export default function TripStatisticsScreen() {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const tripId = id?.trim() || null;

  const { trip, loading, error, refetch } = useTripById(tripId);

  // Update native header title
  useEffect(() => {
    if (trip) {
      navigation.setOptions({
        title: `${trip.name} - Statistics`,
      });
    }
  }, [trip, navigation]);

  if (!tripId) {
    return <ErrorScreen title="Invalid Trip" message="Invalid trip ID" />;
  }

  if (loading) {
    return <LoadingScreen message="Loading trip..." />;
  }

  if (error) {
    return (
      <ErrorScreen
        title="Unable to load trip"
        message={formatErrorMessage(error)}
        actionLabel="Retry"
        onAction={refetch}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Card style={styles.comingSoonCard}>
          <Text style={styles.comingSoonIcon}>📊</Text>
          <Text style={styles.comingSoonTitle}>Statistics Coming Soon</Text>
          <Text style={styles.comingSoonBody}>
            This feature will be added in a future release. You'll be able to
            view:
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>
              • Spending breakdown by category
            </Text>
            <Text style={styles.featureItem}>• Expense trends over time</Text>
            <Text style={styles.featureItem}>
              • Per-participant spending insights
            </Text>
            <Text style={styles.featureItem}>• Currency distribution</Text>
            <Text style={styles.featureItem}>• Export and sharing options</Text>
          </View>
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
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  loadingText: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  errorCard: {
    gap: theme.spacing.sm,
    alignItems: "center",
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceElevated,
  },
  errorTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.error,
  },
  errorText: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  comingSoonCard: {
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  comingSoonIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  comingSoonTitle: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  comingSoonBody: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: "center",
    lineHeight: 22,
  },
  featureList: {
    alignSelf: "stretch",
    gap: theme.spacing.sm,
  },
  featureItem: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
});
