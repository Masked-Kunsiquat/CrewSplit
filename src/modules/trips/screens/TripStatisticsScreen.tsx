/**
 * UI/UX ENGINEER: Trip Statistics Screen
 *
 * Displays trip insights and breakdowns including:
 * - Spending by category
 * - Per-participant statistics
 * - Visual charts and breakdowns
 */

import React, { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { theme } from "@ui/theme";
import { Card, LoadingScreen, ErrorScreen } from "@ui/components";
import { StatsSummaryCard } from "@ui/components/statistics";
import { useTripById } from "../hooks/use-trips";
import { useStatistics } from "@modules/statistics/hooks/use-statistics";
import { CurrencyUtils } from "@utils/currency";
import { formatErrorMessage } from "src/utils/format-error";
import { getCategoryIcon } from "@utils/category-icons";

export default function TripStatisticsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const tripId = id?.trim() || null;

  const {
    trip,
    loading: tripLoading,
    error: tripError,
    refetch: refetchTrip,
  } = useTripById(tripId);
  const {
    statistics,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useStatistics(tripId);

  // Update native header title
  useEffect(() => {
    if (trip) {
      navigation.setOptions({
        title: `${trip.name} - Statistics`,
      });
    }
  }, [trip, navigation]);

  if (!tripId) {
    return (
      <ErrorScreen
        title="Invalid Trip"
        message="Invalid trip ID"
        actionLabel="Back to trips"
        onAction={() => router.replace("/")}
      />
    );
  }

  // Show loading state while either trip or statistics are loading
  if (tripLoading || statsLoading) {
    return <LoadingScreen message="Loading statistics..." />;
  }

  // Show error if trip failed to load
  if (tripError) {
    return (
      <ErrorScreen
        title="Unable to load trip"
        message={formatErrorMessage(tripError)}
        actionLabel="Retry"
        onAction={refetchTrip}
      />
    );
  }

  // Show error if statistics failed to load
  if (statsError) {
    return (
      <ErrorScreen
        title="Unable to load statistics"
        message={formatErrorMessage(statsError)}
        actionLabel="Retry"
        onAction={refetchStats}
      />
    );
  }

  // Check if there are no expenses (empty state)
  const hasExpenses = statistics.totalCost > 0;
  const hasCategories = statistics.categorySpending.length > 0;
  const hasParticipants = statistics.participantSpending.length > 0;

  return (
    <View style={theme.commonStyles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {!hasExpenses ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No Expenses Yet</Text>
            <Text style={styles.emptyBody}>
              Add expenses to this trip to see spending statistics and
              breakdowns.
            </Text>
          </Card>
        ) : (
          <>
            {/* Summary Stats */}
            <StatsSummaryCard
              title="Trip Overview"
              stats={[
                {
                  label: "Total Spent",
                  value: CurrencyUtils.formatMinor(
                    statistics.totalCost,
                    statistics.currency,
                  ),
                },
                {
                  label: "Categories",
                  value: statistics.categorySpending.length.toString(),
                },
                {
                  label: "Participants",
                  value: statistics.participantSpending.length.toString(),
                },
              ]}
            />

            {/* Category Breakdown */}
            {hasCategories && (
              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>Spending by Category</Text>
                {statistics.categorySpending.map((cat, index) => {
                  const color =
                    theme.colors.chartColors[
                      index % theme.colors.chartColors.length
                    ];
                  return (
                    <View
                      key={cat.categoryId || index}
                      style={styles.categoryRow}
                    >
                      <View style={styles.categoryLeft}>
                        <View style={styles.categoryIconContainer}>
                          {getCategoryIcon({
                            categoryName: cat.categoryName || "Other",
                            size: 20,
                            color,
                          })}
                        </View>
                        <Text style={styles.categoryLabel}>
                          {cat.categoryName || "Uncategorized"}
                        </Text>
                      </View>
                      <View style={styles.categoryRight}>
                        <Text style={styles.categoryAmount}>
                          {CurrencyUtils.formatMinor(
                            cat.totalAmount,
                            statistics.currency,
                          )}
                        </Text>
                        <Text style={styles.categoryPercentage}>
                          {cat.percentage.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </Card>
            )}

            {/* Participant Spending */}
            {hasParticipants && (
              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>Spending by Participant</Text>
                {statistics.participantSpending.map((participant) => (
                  <View
                    key={participant.participantId}
                    style={styles.participantRow}
                  >
                    <Text style={styles.participantName}>
                      {participant.participantName}
                    </Text>
                    <View style={styles.participantStats}>
                      <Text style={styles.participantAmount}>
                        {CurrencyUtils.formatMinor(
                          participant.totalPaid,
                          statistics.currency,
                        )}
                      </Text>
                      <Text style={styles.participantPercentage}>
                        {participant.percentage.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>
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
  emptyCard: {
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  section: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
  },
  sectionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flex: 1,
  },
  categoryIconContainer: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    flex: 1,
  },
  categoryRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  categoryAmount: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  categoryPercentage: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  participantRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  participantName: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    flex: 1,
  },
  participantStats: {
    alignItems: "flex-end",
    gap: 2,
  },
  participantAmount: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  participantPercentage: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
});
