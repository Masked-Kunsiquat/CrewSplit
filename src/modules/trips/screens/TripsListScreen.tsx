import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { theme } from "@ui/theme";
import { Button, Card } from "@ui/components";
import { useTrips } from "../hooks/use-trips";
import { useRefreshControl } from "@hooks/use-refresh-control";
import { SampleTripBadge } from "@modules/onboarding/components/SampleTripBadge";

/**
 * Validates and formats a single date string
 * @param dateString - ISO 8601 date string to parse
 * @returns Formatted date string (MM/DD/YY)
 * @throws Error with code "INVALID_DATE_FORMAT" if date is invalid
 */
function formatSingleDate(dateString: string): string {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    const error = new Error(`Invalid date format: "${dateString}"`) as Error & {
      code: string;
    };
    error.code = "INVALID_DATE_FORMAT";
    throw error;
  }

  return `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}/${date.getFullYear().toString().slice(-2)}`;
}

/**
 * Formats a date range for display
 * @param startDate - Start date string (required)
 * @param endDate - End date string (optional)
 * @returns Formatted date range (e.g., "01/15/24" or "01/15/24 - 01/20/24")
 */
function formatDateRange(startDate: string, endDate?: string | null): string {
  const startFormatted = formatSingleDate(startDate);

  if (!endDate) {
    return startFormatted;
  }

  const endFormatted = formatSingleDate(endDate);
  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Render the Trips list screen with loading, error, empty, and populated states and navigation controls.
 *
 * Displays an activity indicator while loading, an error card if fetching fails, an empty-state card when there are no trips, and a list of trip cards when trips exist. Configures the header title and a settings button, supports pull-to-refresh, and includes a footer button to create a new trip.
 *
 * @returns The JSX element for the Trips list screen.
 */
export default function TripsListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { trips, loading, error, refetch } = useTrips();

  // Pull-to-refresh support
  const refreshControl = useRefreshControl([refetch]);

  // Set header title for home screen
  useEffect(() => {
    navigation.setOptions({
      title: "Trips",
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push("/settings")}
          activeOpacity={0.7}
          accessibilityLabel="Open settings"
          accessibilityRole="button"
          accessibilityHint="Opens settings for the app"
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, router]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
      >
        {loading && (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}

        {error && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error.message}</Text>
          </Card>
        )}

        {!loading && !error && trips.length === 0 && (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptyText}>
              Create your first trip to start tracking shared expenses with your
              crew.
            </Text>
          </Card>
        )}

        {!loading &&
          !error &&
          trips.map((trip) => (
            <Card
              key={trip.id}
              style={styles.tripCard}
              onPress={() => router.push(`/trips/${trip.id}`)}
            >
              {trip.isSampleData && (
                <SampleTripBadge style={styles.sampleBadge} />
              )}
              <View style={styles.tripHeader}>
                {trip.emoji && (
                  <Text style={styles.tripEmoji}>{trip.emoji}</Text>
                )}
                <View style={styles.tripInfo}>
                  <Text style={styles.tripName}>{trip.name}</Text>
                  <Text style={styles.tripMeta}>
                    {trip.currency} •{" "}
                    {formatDateRange(trip.startDate, trip.endDate)}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Create Trip"
          onPress={() => router.push("/trips/create")}
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
  headerButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  settingsIcon: {
    fontSize: 24,
    color: theme.colors.textSecondary,
  },
  centerContent: {
    alignItems: "center",
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
    borderStyle: "dashed",
    borderColor: theme.colors.border,
    borderWidth: 1,
    alignItems: "center",
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
    textAlign: "center",
  },
  tripCard: {
    backgroundColor: theme.colors.surfaceElevated,
    position: "relative",
  },
  sampleBadge: {
    position: "absolute",
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    zIndex: 1,
  },
  tripHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  tripEmoji: {
    fontSize: 32,
  },
  tripInfo: {
    flex: 1,
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
