/**
 * UI/UX ENGINEER: Trip Statistics Screen
 *
 * Displays trip insights and breakdowns including:
 * - Spending by category
 * - Per-participant statistics
 * - Visual charts and breakdowns
 */

import React, { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { theme } from "@ui/theme";
import { Card, LoadingScreen, ErrorScreen } from "@ui/components";
import {
  StatsSummaryCard,
  CategoryPieChart,
  CategoryBarChart,
} from "@ui/components/statistics";
import { useTripById } from "../hooks/use-trips";
import { useStatistics } from "@modules/statistics/hooks/use-statistics";
import { CurrencyUtils } from "@utils/currency";
import { formatErrorMessage } from "src/utils/format-error";
import { getCategoryIcon } from "@utils/category-icons";
import { useRefreshControl } from "@hooks/use-refresh-control";

/**
 * Screen component that displays statistics for a trip, including total spent,
 * spending by category, and spending by participant.
 *
 * Renders loading and error states, an empty-state when no expenses exist,
 * a summary card with aggregate metrics, a category breakdown with percentages,
 * and a participant list whose rows navigate to the participant detail screen.
 * Supports pull-to-refresh and updates the native header title to include the
 * trip name when available.
 *
 * @returns The React element for the Trip Statistics screen.
 */
export default function TripStatisticsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const tripId = id?.trim() || null;
  const formatPercentage = (value: unknown) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue.toFixed(1) : "-";
  };

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

  // Pull-to-refresh support
  const refreshControl = useRefreshControl([refetchTrip, refetchStats]);

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
        refreshControl={refreshControl}
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

                {/* Pie Chart */}
                <View style={styles.chartContainer}>
                  <CategoryPieChart
                    data={statistics.categorySpending.map((cat, index) => ({
                      categoryName: cat.categoryName || "Uncategorized",
                      amount: cat.totalAmount,
                      percentage: cat.percentage,
                      color:
                        theme.colors.chartColors[
                          index % theme.colors.chartColors.length
                        ],
                      emoji: cat.categoryEmoji || undefined,
                    }))}
                    size={250}
                    showLabels={true}
                    innerRadius={60}
                    accessibilityLabel={`Category spending pie chart with ${statistics.categorySpending.length} categories`}
                  />
                </View>

                {/* Category List */}
                <View style={styles.categoryList}>
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
                          <View
                            style={[
                              styles.colorDot,
                              { backgroundColor: color },
                            ]}
                          />
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
                            {formatPercentage(cat.percentage)}%
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Card>
            )}

            {/* Participant Spending */}
            {hasParticipants && (
              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>Spending by Participant</Text>

                {/* Bar Chart */}
                <View style={styles.chartContainer}>
                  <CategoryBarChart
                    data={statistics.participantSpending.map(
                      (participant, index) => ({
                        categoryName: participant.participantName,
                        amount: participant.totalPaid,
                        color:
                          theme.colors.chartColors[
                            index % theme.colors.chartColors.length
                          ],
                      }),
                    )}
                    height={250}
                    currency={statistics.currency}
                    accessibilityLabel={`Participant spending bar chart with ${statistics.participantSpending.length} participants`}
                  />
                </View>

                {/* Participant List */}
                <View style={styles.participantList}>
                  {statistics.participantSpending.map((participant, index) => {
                    const color =
                      theme.colors.chartColors[
                        index % theme.colors.chartColors.length
                      ];
                    return (
                      <Pressable
                        key={participant.participantId}
                        style={styles.participantRow}
                        accessibilityRole="button"
                        accessibilityLabel={`View participant ${participant.participantName}`}
                        onPress={() =>
                          router.push(
                            `/trips/${tripId}/participants/${participant.participantId}`,
                          )
                        }
                      >
                        <View style={styles.participantLeft}>
                          <View
                            style={[
                              styles.colorDot,
                              { backgroundColor: color },
                            ]}
                          />
                          <Text style={styles.participantName}>
                            {participant.participantName}
                          </Text>
                        </View>
                        <View style={styles.participantStats}>
                          <Text style={styles.participantAmount}>
                            {CurrencyUtils.formatMinor(
                              participant.totalPaid,
                              statistics.currency,
                            )}
                          </Text>
                          <Text style={styles.participantPercentage}>
                            {formatPercentage(participant.percentage)}%
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
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
  chartContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  categoryList: {
    gap: theme.spacing.sm,
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
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  participantList: {
    gap: theme.spacing.sm,
  },
  participantRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  participantLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flex: 1,
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
