import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { theme } from "@ui/theme";
import { Button, Card, ConfirmDialog } from "@ui/components";
import { useTrips } from "../hooks/use-trips";
import { useBulkDeleteTrips } from "../hooks/use-trip-mutations";
import { useRefreshControl } from "@hooks/use-refresh-control";
import { SampleTripBadge } from "@modules/onboarding/components/SampleTripBadge";
import { TripExportModal } from "../components/trip-export-modal";

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportTripId, setExportTripId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { removeBulk: bulkDeleteTrips } = useBulkDeleteTrips();

  const selectedCount = selectedIds.size;
  const selectedTripIds = useMemo(() => Array.from(selectedIds), [selectedIds]);

  // Pull-to-refresh support
  const refreshControl = useRefreshControl([refetch]);

  // Set header title for home screen
  useEffect(() => {
    navigation.setOptions({
      title: selectedCount > 0 ? `${selectedCount} Selected` : "Trips",
      headerRight: () =>
        selectedCount > 0 ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setSelectedIds(new Set())}
            activeOpacity={0.7}
            accessibilityLabel="Exit selection"
            accessibilityRole="button"
            accessibilityHint="Clears selected trips"
          >
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        ) : (
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
  }, [navigation, router, selectedCount]);

  const toggleSelection = (tripId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tripId)) {
        next.delete(tripId);
      } else {
        next.add(tripId);
      }
      return next;
    });
  };

  const handleTripPress = (tripId: string) => {
    if (selectedCount > 0) {
      toggleSelection(tripId);
      return;
    }
    router.push(`/trips/${tripId}`);
  };

  const handleTripLongPress = (tripId: string) => {
    toggleSelection(tripId);
  };

  const handleExportSelected = () => {
    if (selectedCount !== 1) {
      return;
    }
    setExportTripId(selectedTripIds[0] ?? null);
  };

  const handleDeleteSelected = () => {
    if (selectedCount === 0 || deleting) {
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSelected = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      // Use bulk delete service for atomic transaction
      await bulkDeleteTrips(selectedTripIds);
      setSelectedIds(new Set());
      await refetch();
    } catch (err) {
      console.error("Failed to delete trips", err);
      Alert.alert("Error", "Failed to delete selected trips.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={theme.commonStyles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
      >
        {loading && (
          <View style={theme.commonStyles.centerContent}>
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
          trips.map((trip) => {
            const isSelected = selectedIds.has(trip.id);
            return (
              <Card
                key={trip.id}
                style={[styles.tripCard, isSelected && styles.tripCardSelected]}
                onPress={() => handleTripPress(trip.id)}
                onLongPress={() => handleTripLongPress(trip.id)}
              >
                {selectedCount > 0 && (
                  <View
                    style={[
                      styles.selectBadge,
                      isSelected && styles.selectBadgeSelected,
                    ]}
                  >
                    <Text style={styles.selectBadgeText}>
                      {isSelected ? "✓" : ""}
                    </Text>
                  </View>
                )}
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
            );
          })}
      </ScrollView>

      {selectedCount > 0 ? (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionCount}>{selectedCount} selected</Text>
          <View style={styles.selectionActions}>
            <Button
              title="Export"
              variant="outline"
              onPress={handleExportSelected}
              disabled={selectedCount !== 1}
            />
            <Button
              title={deleting ? "Deleting..." : "Delete"}
              onPress={handleDeleteSelected}
              disabled={deleting}
            />
          </View>
        </View>
      ) : (
        <View style={theme.commonStyles.footer}>
          <Button
            title="Create Trip"
            onPress={() => router.push("/trips/create")}
            fullWidth
          />
        </View>
      )}

      {exportTripId && (
        <TripExportModal
          visible={!!exportTripId}
          tripId={exportTripId}
          onClose={() => setExportTripId(null)}
        />
      )}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete trips?"
        message={`This will permanently delete ${
          selectedCount === 1 ? "this trip" : "these trips"
        }, including participants, expenses, and settlements.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteSelected}
        loading={deleting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  doneText: {
    fontSize: theme.typography.base,
    color: theme.colors.primary,
    fontWeight: theme.typography.semibold,
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
  tripCardSelected: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  selectBadge: {
    position: "absolute",
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  selectBadgeSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  selectBadgeText: {
    fontSize: theme.typography.sm,
    color: theme.colors.background,
    fontWeight: theme.typography.bold,
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
  selectionBar: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  selectionCount: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    fontWeight: theme.typography.semibold,
  },
  selectionActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
});
