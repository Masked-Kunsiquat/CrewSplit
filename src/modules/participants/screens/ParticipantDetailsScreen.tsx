/**
 * UI/UX ENGINEER: Participant Details Screen
 * Shows detailed financial information about a participant within a trip
 */

import React, { useState, useMemo, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { theme } from "@ui/theme";
import { Card, LoadingScreen, ErrorScreen } from "@ui/components";
import { useParticipants } from "../hooks/use-participants";
import { useSettlement } from "@modules/settlements/hooks/use-settlement";
import { useExpenses } from "@modules/expenses/hooks/use-expenses";
import { useExpenseCategories } from "@modules/expenses/hooks/use-expense-categories";
import { useDisplayCurrency } from "@modules/settings/hooks/use-display-currency";
import { useRefreshControl } from "@hooks/use-refresh-control";
import { formatCurrency } from "@utils/currency";
import { normalizeRouteParam } from "@utils/route-params";
import { getCategoryIcon } from "@utils/category-icons";
import { cachedFxRateProvider } from "@modules/fx-rates/provider";
import type { ExpenseSplit } from "@modules/expenses/types";
import { getExpenseSplits } from "@modules/expenses/repository";
import { useSettlements } from "@modules/settlements/hooks/use-settlements";
import { TransactionRow } from "@modules/settlements/components/TransactionRow";

type ViewMode = "paid-by" | "part-of";

export default function ParticipantDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string | string[];
    participantId?: string | string[];
  }>();

  const tripId = normalizeRouteParam(params.id);
  const participantId = normalizeRouteParam(params.participantId);

  if (!tripId || !participantId) {
    return (
      <ErrorScreen
        title="Invalid Request"
        message={
          !tripId
            ? "Missing trip ID. Please go back and try again."
            : "Missing participant ID. Please select a participant."
        }
        actionLabel="Back"
        onAction={() => router.back()}
      />
    );
  }

  return (
    <ParticipantDetailsContent tripId={tripId} participantId={participantId} />
  );
}

/**
 * Renders the Participant Details view for a given trip and participant, showing the participant's financial summary, settlement actions, expenses (paid-by and part-of views), and category breakdown.
 *
 * @param tripId - The trip identifier used to fetch participants, expenses, and settlement data.
 * @param participantId - The participant identifier whose details are displayed.
 * @returns The JSX element for the participant details screen.
 */
function ParticipantDetailsContent({
  tripId,
  participantId,
}: {
  tripId: string;
  participantId: string;
}) {
  const router = useRouter();
  const navigation = useNavigation();
  const [viewMode, setViewMode] = useState<ViewMode>("paid-by");
  const [expenseSplitsMap, setExpenseSplitsMap] = useState<
    Map<string, ExpenseSplit[]>
  >(new Map());

  const { displayCurrency } = useDisplayCurrency();
  const {
    participants,
    loading: participantsLoading,
    refetch: refetchParticipants,
  } = useParticipants(tripId);
  const {
    settlement,
    loading: settlementLoading,
    refetch: refetchSettlement,
  } = useSettlement(tripId);
  const {
    expenses,
    loading: expensesLoading,
    refetch: refetchExpenses,
  } = useExpenses(tripId);
  const { categories } = useExpenseCategories(tripId);
  const {
    settlements: recordedSettlements,
    loading: settlementsLoading,
    error: settlementsError,
    refetch: refetchSettlements,
  } = useSettlements(tripId);

  // Pull-to-refresh
  const refreshControl = useRefreshControl([
    refetchParticipants,
    refetchSettlement,
    refetchExpenses,
    refetchSettlements,
  ]);

  // Find the participant
  const participant = useMemo(
    () => participants.find((p) => p.id === participantId),
    [participants, participantId],
  );

  // Find participant's balance
  const participantBalance = useMemo(
    () => settlement.balances.find((b) => b.participantId === participantId),
    [settlement.balances, participantId],
  );

  // Filter settlements for this participant
  const participantSettlements = useMemo(
    () =>
      settlement.settlements.filter(
        (s) => s.from === participantId || s.to === participantId,
      ),
    [settlement.settlements, participantId],
  );

  const participantTransactions = useMemo(
    () =>
      recordedSettlements.filter(
        (transaction) =>
          transaction.fromParticipantId === participantId ||
          transaction.toParticipantId === participantId,
      ),
    [recordedSettlements, participantId],
  );

  const sortedTransactions = useMemo(
    () =>
      [...participantTransactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [participantTransactions],
  );

  const visibleTransactions = sortedTransactions.slice(0, 3);

  // Load expense splits for all expenses
  useEffect(() => {
    let cancelled = false;

    const loadSplits = async () => {
      const splitsMap = new Map<string, ExpenseSplit[]>();
      await Promise.all(
        expenses.map(async (expense) => {
          const splits = await getExpenseSplits(expense.id);
          splitsMap.set(expense.id, splits);
        }),
      );

      if (!cancelled) {
        setExpenseSplitsMap(splitsMap);
      }
    };

    if (expenses.length > 0) {
      loadSplits();
    }

    return () => {
      cancelled = true;
    };
  }, [expenses]);

  // Filter expenses paid by this participant
  const expensesPaidBy = useMemo(
    () => expenses.filter((e) => e.paidBy === participantId),
    [expenses, participantId],
  );

  // Filter expenses this participant is part of
  const expensesPartOf = useMemo(() => {
    return expenses.filter((expense) => {
      const splits = expenseSplitsMap.get(expense.id) || [];
      return splits.some((split) => split.participantId === participantId);
    });
  }, [expenses, participantId, expenseSplitsMap]);

  // Calculate category breakdown for "paid by" expenses
  const categoryBreakdown = useMemo(() => {
    const breakdown = new Map<string, number>();
    expensesPaidBy.forEach((expense) => {
      const current = breakdown.get(expense.categoryId || "uncategorized") || 0;
      breakdown.set(
        expense.categoryId || "uncategorized",
        current + expense.convertedAmountMinor,
      );
    });
    return breakdown;
  }, [expensesPaidBy]);

  // Get current expenses to display based on view mode
  const currentExpenses =
    viewMode === "paid-by" ? expensesPaidBy : expensesPartOf;

  // Precompute FX conversions for all expenses to avoid crashes during render
  const expenseDisplayAmounts = useMemo(() => {
    if (!displayCurrency) return new Map<string, number | null>();

    const conversions = new Map<string, number | null>();
    currentExpenses.forEach((expense) => {
      try {
        const fxRate = cachedFxRateProvider.getRate(
          expense.currency,
          displayCurrency,
        );
        const converted = Math.round(expense.convertedAmountMinor * fxRate);
        // Guard against NaN
        conversions.set(expense.id, isNaN(converted) ? null : converted);
      } catch (error) {
        // Log missing rate for debugging
        console.warn(
          `[ParticipantDetails] Missing FX rate: ${expense.currency} -> ${displayCurrency} for expense ${expense.id}`,
          error,
        );
        conversions.set(expense.id, null);
      }
    });

    return conversions;
  }, [currentExpenses, displayCurrency]);

  // Precompute FX conversions for category breakdown
  const categoryDisplayAmounts = useMemo(() => {
    if (!displayCurrency) return new Map<string, number | null>();

    const conversions = new Map<string, number | null>();
    try {
      const fxRate = cachedFxRateProvider.getRate(
        settlement.currency,
        displayCurrency,
      );

      categoryBreakdown.forEach((amount, categoryId) => {
        const converted = Math.round(amount * fxRate);
        // Guard against NaN
        conversions.set(categoryId, isNaN(converted) ? null : converted);
      });
    } catch (error) {
      // Log missing rate for debugging
      console.warn(
        `[ParticipantDetails] Missing FX rate: ${settlement.currency} -> ${displayCurrency} for category breakdown`,
        error,
      );
      // Leave map empty - all conversions will be null
    }

    return conversions;
  }, [categoryBreakdown, displayCurrency, settlement.currency]);

  // Update native header title
  useEffect(() => {
    if (participant) {
      navigation.setOptions({
        title: participant.name,
      });
    }
  }, [participant, navigation]);

  // Calculate display currency amounts
  const displayAmounts = useMemo(() => {
    if (!participantBalance || !displayCurrency) return null;

    try {
      const fxRate = cachedFxRateProvider.getRate(
        settlement.currency,
        displayCurrency,
      );

      return {
        netPosition: Math.round(participantBalance.netPosition * fxRate),
        totalPaid: Math.round(participantBalance.totalPaid * fxRate),
        totalOwed: Math.round(participantBalance.totalOwed * fxRate),
        currency: displayCurrency,
      };
    } catch {
      return null;
    }
  }, [participantBalance, displayCurrency, settlement.currency]);

  const loading = participantsLoading || settlementLoading || expensesLoading;

  if (loading) {
    return <LoadingScreen message="Loading participant details..." />;
  }

  if (!participant) {
    return (
      <ErrorScreen
        title="Participant Not Found"
        message="This participant could not be found in the trip."
        actionLabel="Back to participants"
        onAction={() => router.replace(`/trips/${tripId}/participants`)}
      />
    );
  }

  const netPosition = participantBalance?.netPosition || 0;
  const totalPaid = participantBalance?.totalPaid || 0;
  const totalOwed = participantBalance?.totalOwed || 0;

  // Determine net position color
  const getNetPositionColor = () => {
    if (netPosition > 0) return theme.colors.success; // Owed money
    if (netPosition < 0) return theme.colors.error; // Owes money
    return theme.colors.textSecondary; // Balanced
  };

  const netPositionColor = getNetPositionColor();

  // Format net position with sign
  const formatNetPosition = (amount: number, currency: string) => {
    if (amount === 0) return formatCurrency(0, currency);
    const sign = amount > 0 ? "+" : "";
    return sign + formatCurrency(amount, currency);
  };

  return (
    <View style={theme.commonStyles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
      >
        {/* Header Section */}
        <Card style={styles.headerCard}>
          <View style={styles.headerContent}>
            {/* Avatar */}
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor:
                    participant.avatarColor || theme.colors.primary,
                },
              ]}
            >
              <Text style={styles.avatarText}>
                {participant.name.charAt(0).toUpperCase()}
              </Text>
            </View>

            {/* Participant Name */}
            <Text style={styles.participantName}>{participant.name}</Text>

            {/* Financial Summary */}
            <View style={styles.statsContainer}>
              {/* Net Position */}
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Net Position</Text>
                <Text style={[styles.statValue, { color: netPositionColor }]}>
                  {formatNetPosition(netPosition, settlement.currency)}
                </Text>
                {displayAmounts && (
                  <Text style={theme.commonStyles.displayCurrencySmall}>
                    {formatNetPosition(
                      displayAmounts.netPosition,
                      displayAmounts.currency,
                    )}
                  </Text>
                )}
              </View>

              {/* Total Paid */}
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Paid</Text>
                <Text style={styles.statValue}>
                  {formatCurrency(totalPaid, settlement.currency)}
                </Text>
                {displayAmounts && (
                  <Text style={theme.commonStyles.displayCurrencySmall}>
                    {formatCurrency(
                      displayAmounts.totalPaid,
                      displayAmounts.currency,
                    )}
                  </Text>
                )}
              </View>

              {/* Total Consumed */}
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Consumed</Text>
                <Text style={styles.statValue}>
                  {formatCurrency(totalOwed, settlement.currency)}
                </Text>
                {displayAmounts && (
                  <Text style={theme.commonStyles.displayCurrencySmall}>
                    {formatCurrency(
                      displayAmounts.totalOwed,
                      displayAmounts.currency,
                    )}
                  </Text>
                )}
              </View>

              {/* Participation Rate */}
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Participation</Text>
                <Text style={styles.statValue}>
                  {expensesPartOf.length}/{expenses.length} expenses
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Settlement Actions Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Settlement Actions</Text>
          {participantSettlements.length > 0 ? (
            <View style={styles.settlementList}>
              {participantSettlements.map((settlementItem, index) => {
                const isFrom = settlementItem.from === participantId;
                const otherParticipantName = isFrom
                  ? settlementItem.toName
                  : settlementItem.fromName;
                const actionText = isFrom
                  ? `Pay ${otherParticipantName}`
                  : `Receive from ${otherParticipantName}`;
                const amountColor = isFrom
                  ? theme.colors.error
                  : theme.colors.success;

                return (
                  <View
                    key={`${settlementItem.from}-${settlementItem.to}-${index}`}
                    style={styles.settlementCard}
                  >
                    <Text style={styles.settlementText}>{actionText}</Text>
                    <Text
                      style={[styles.settlementAmount, { color: amountColor }]}
                    >
                      {formatCurrency(
                        settlementItem.amount,
                        settlement.currency,
                      )}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Card style={styles.emptyStateCard}>
              <Text style={styles.emptyStateText}>All settled up!</Text>
            </Card>
          )}
        </Card>

        {/* Transactions */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            {participantTransactions.length > 0 && (
              <Pressable
                onPress={() => router.push(`/trips/${tripId}/settlement`)}
                accessibilityRole="button"
                accessibilityLabel="View all transactions"
              >
                <Text style={styles.sectionLink}>View all</Text>
              </Pressable>
            )}
          </View>
          {settlementsLoading && (
            <Text style={styles.sectionHelper}>Loading transactions...</Text>
          )}
          {!settlementsLoading && settlementsError && (
            <Text style={styles.sectionHelper}>
              {settlementsError.message || "Failed to load transactions."}
            </Text>
          )}
          {!settlementsLoading &&
            !settlementsError &&
            participantTransactions.length === 0 && (
              <Text style={styles.sectionHelper}>
                No payments recorded for this participant yet.
              </Text>
            )}
          {!settlementsLoading &&
            !settlementsError &&
            participantTransactions.length > 0 &&
            visibleTransactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                settlement={transaction}
                onPress={() =>
                  router.push(
                    `/trips/${tripId}/settlements/${transaction.id}`,
                  )
                }
              />
            ))}
          {!settlementsLoading &&
            !settlementsError &&
            participantTransactions.length > visibleTransactions.length && (
              <Pressable
                style={styles.sectionFooterLink}
                onPress={() => router.push(`/trips/${tripId}/settlement`)}
                accessibilityRole="button"
                accessibilityLabel="View all transactions"
              >
                <Text style={styles.sectionLink}>
                  View all {participantTransactions.length} transactions →
                </Text>
              </Pressable>
            )}
        </Card>

        {/* Expenses Section */}
        <Card style={styles.section}>
          <View style={styles.expenseHeaderContainer}>
            <Text style={styles.sectionTitle}>Expenses</Text>
            <View style={styles.segmentedControl}>
              <Pressable
                style={[
                  styles.segmentButton,
                  viewMode === "paid-by" && styles.segmentButtonActive,
                ]}
                onPress={() => setViewMode("paid-by")}
                accessibilityRole="button"
                accessibilityLabel="Show expenses paid by this participant"
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    viewMode === "paid-by" && styles.segmentButtonTextActive,
                  ]}
                >
                  Paid By ({expensesPaidBy.length})
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.segmentButton,
                  viewMode === "part-of" && styles.segmentButtonActive,
                ]}
                onPress={() => setViewMode("part-of")}
                accessibilityRole="button"
                accessibilityLabel="Show expenses this participant is part of"
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    viewMode === "part-of" && styles.segmentButtonTextActive,
                  ]}
                >
                  Part Of ({expensesPartOf.length})
                </Text>
              </Pressable>
            </View>
          </View>

          {currentExpenses.length > 0 ? (
            <View style={styles.expenseList}>
              {currentExpenses.map((expense) => {
                const category = categories.find(
                  (c) => c.id === expense.categoryId,
                );
                const categoryName = category?.name || "Other";
                return (
                  <Pressable
                    key={expense.id}
                    style={({ pressed }) => [
                      styles.expenseCard,
                      pressed && styles.expenseCardPressed,
                    ]}
                    onPress={() =>
                      router.push(`/trips/${tripId}/expenses/${expense.id}`)
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`View expense: ${expense.description}`}
                  >
                    <View style={styles.expenseInfo}>
                      <View style={styles.expenseTopRow}>
                        <View style={styles.expenseIcon}>
                          {getCategoryIcon({
                            categoryName,
                            size: 20,
                          })}
                        </View>
                        <Text
                          style={styles.expenseDescription}
                          numberOfLines={1}
                        >
                          {expense.description}
                        </Text>
                      </View>
                      <Text style={styles.expenseDate}>
                        {new Date(expense.date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.expenseAmounts}>
                      <Text style={styles.expenseAmount}>
                        {formatCurrency(
                          expense.convertedAmountMinor,
                          expense.currency,
                        )}
                      </Text>
                      {displayAmounts &&
                        expenseDisplayAmounts.has(expense.id) && (
                          <Text style={theme.commonStyles.displayCurrencySmall}>
                            {expenseDisplayAmounts.get(expense.id) !== null
                              ? formatCurrency(
                                  expenseDisplayAmounts.get(expense.id)!,
                                  displayAmounts.currency,
                                )
                              : "—"}
                          </Text>
                        )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Card style={styles.emptyStateCard}>
              <Text style={styles.emptyStateText}>
                {viewMode === "paid-by"
                  ? "No expenses paid by this participant"
                  : "Not part of any expenses"}
              </Text>
            </Card>
          )}
        </Card>

        {/* Category Breakdown (only for "Paid By" mode) */}
        {viewMode === "paid-by" && categoryBreakdown.size > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Category Breakdown</Text>
            <View style={styles.categoryList}>
              {Array.from(categoryBreakdown.entries())
                .sort((a, b) => b[1] - a[1]) // Sort by amount descending
                .map(([categoryId, amount]) => {
                  const category = categories.find((c) => c.id === categoryId);
                  const categoryName = category?.name || "Uncategorized";

                  return (
                    <View key={categoryId} style={styles.categoryCard}>
                      <View style={styles.categoryInfo}>
                        <View style={styles.categoryIcon}>
                          {getCategoryIcon({
                            categoryName,
                            size: 20,
                          })}
                        </View>
                        <Text style={styles.categoryName}>{categoryName}</Text>
                      </View>
                      <View style={styles.categoryAmounts}>
                        <Text style={styles.categoryAmount}>
                          {formatCurrency(amount, settlement.currency)}
                        </Text>
                        {displayAmounts &&
                          categoryDisplayAmounts.has(categoryId) && (
                            <Text
                              style={theme.commonStyles.displayCurrencySmall}
                            >
                              {categoryDisplayAmounts.get(categoryId) !== null
                                ? formatCurrency(
                                    categoryDisplayAmounts.get(categoryId)!,
                                    displayAmounts.currency,
                                  )
                                : "—"}
                            </Text>
                          )}
                      </View>
                    </View>
                  );
                })}
            </View>
          </Card>
        )}
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
    gap: theme.spacing.md,
  },
  errorText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  headerCard: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  headerContent: {
    alignItems: "center",
    gap: theme.spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: theme.typography.bold,
    color: "#FFFFFF",
  },
  participantName: {
    fontSize: theme.typography.xxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    textAlign: "center",
  },
  statsContainer: {
    width: "100%",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  statLabel: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    flexShrink: 0,
  },
  statValue: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    textAlign: "right",
    flex: 1,
  },
  section: {
    backgroundColor: theme.colors.surfaceElevated,
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  sectionLink: {
    fontSize: theme.typography.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.semibold,
  },
  sectionHelper: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  sectionFooterLink: {
    paddingTop: theme.spacing.xs,
  },
  settlementList: {
    gap: theme.spacing.sm,
  },
  settlementCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing.md,
  },
  settlementText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    fontWeight: theme.typography.medium,
    flex: 1,
    flexWrap: "wrap",
  },
  settlementAmount: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    flexShrink: 0,
    textAlign: "right",
  },
  emptyStateCard: {
    backgroundColor: theme.colors.surface,
  },
  emptyStateText: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  expenseHeaderContainer: {
    gap: theme.spacing.sm,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    padding: 2,
    gap: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: "center",
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentButtonText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.medium,
  },
  segmentButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: theme.typography.semibold,
  },
  expenseList: {
    gap: theme.spacing.sm,
  },
  expenseCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expenseCardPressed: {
    opacity: 0.7,
  },
  expenseInfo: {
    flex: 1,
    gap: 4,
    marginRight: theme.spacing.md,
  },
  expenseTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  expenseIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.xs,
  },
  expenseDescription: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    fontWeight: theme.typography.medium,
    flex: 1,
  },
  expenseDate: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
  },
  expenseAmounts: {
    alignItems: "flex-end",
    gap: 2,
    minWidth: 100,
    flexShrink: 1,
  },
  expenseAmount: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    textAlign: "right",
  },
  categoryList: {
    gap: theme.spacing.sm,
  },
  categoryCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.sm,
  },
  categoryIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryName: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    fontWeight: theme.typography.medium,
  },
  categoryAmounts: {
    alignItems: "flex-end",
    gap: 2,
    minWidth: 100,
    flexShrink: 1,
  },
  categoryAmount: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    textAlign: "right",
  },
});
