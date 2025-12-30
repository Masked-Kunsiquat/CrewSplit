/**
 * UI/UX ENGINEER: Trip History Screen
 * Displays chronological timeline of all changes to a trip
 */

import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { theme } from "@ui/theme";
import { Card } from "@ui/components";
import { useFormattedHistory } from "../hooks/use-formatted-history";
import { HistoryTimeline } from "../components";

export default function TripHistoryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const tripId = id?.trim() || null;

  if (!tripId) {
    return (
      <View style={theme.commonStyles.container}>
        <View style={theme.commonStyles.centerContent}>
          <Text style={styles.errorText}>
            Invalid trip. Please select a trip again.
          </Text>
        </View>
      </View>
    );
  }

  return <TripHistoryScreenContent tripId={tripId} />;
}

function TripHistoryScreenContent({ tripId }: { tripId: string }) {
  const navigation = useNavigation();
  const { changes, loading, error } = useFormattedHistory(tripId);

  // Update native header title
  useEffect(() => {
    navigation.setOptions({
      title: "History",
    });
  }, [navigation]);

  if (error) {
    return (
      <View style={theme.commonStyles.container}>
        <View style={styles.errorContainer}>
          <Card style={styles.errorCard}>
            <Text style={styles.errorTitle}>Failed to load history</Text>
            <Text style={styles.errorMessage}>{error.message}</Text>
            <Text style={styles.errorHint}>
              This trip may not have an Automerge document yet. History is only
              available for trips created or migrated after the Automerge
              integration.
            </Text>
          </Card>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={theme.commonStyles.container}>
        <View style={theme.commonStyles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={theme.commonStyles.loadingText}>Loading history...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={theme.commonStyles.container}>
      <HistoryTimeline changes={changes} emptyMessage="No changes yet" />
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    padding: theme.spacing.lg,
  },
  errorCard: {
    backgroundColor: theme.colors.surface,
  },
  errorTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
  errorMessage: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  errorHint: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
  errorText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
  },
});
