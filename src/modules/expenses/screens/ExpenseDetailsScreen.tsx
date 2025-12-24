/**
 * UI/UX ENGINEER: Expense Details Screen
 * Shows expense details with original, converted, and display currency amounts
 */

import React, { useMemo, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { theme } from "@ui/theme";
import {
  Button,
  Card,
  ConfirmDialog,
  NoRateAvailableModal,
  StalenessWarningBanner,
  LoadingScreen,
  ErrorScreen,
} from "@ui/components";
import { useExpenseWithSplits } from "../hooks/use-expenses";
import { useExpenseCategories } from "../hooks/use-expense-categories";
import { useParticipants } from "@modules/participants/hooks/use-participants";
import { useDisplayCurrency } from "@modules/settings/hooks/use-display-currency";
import { formatCurrency } from "@utils/currency";
import { normalizeRouteParam } from "@utils/route-params";
import { getCategoryIcon } from "@utils/category-icons";
import { cachedFxRateProvider } from "@modules/fx-rates/provider";
import { deleteExpense } from "../repository";
import { currencyLogger } from "@utils/logger";
import { useRefreshControl } from "@hooks/use-refresh-control";
import { useFxSync } from "@modules/fx-rates/hooks/use-fx-sync";

export default function ExpenseDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string | string[];
    expenseId?: string | string[];
  }>();
  const tripId = normalizeRouteParam(params.id);
  const expenseId = normalizeRouteParam(params.expenseId);

  if (!tripId || !expenseId) {
    return (
      <ErrorScreen
        title="Invalid Expense"
        message={
          !tripId
            ? "Missing trip ID. Please go back and try again."
            : "Missing expense ID. Please select an expense."
        }
        actionLabel="Back"
        onAction={() => router.back()}
      />
    );
  }

  return <ExpenseDetailsContent tripId={tripId} expenseId={expenseId} />;
}

/**
 * Render the expense details screen for a specific trip expense.
 *
 * Displays the expense amounts (original, converted to trip currency, and optional display currency),
 * participant split details, metadata (paid by, date, category, notes), and UI for editing or deleting the expense.
 * Handles pull-to-refresh, FX rate staleness and recovery (modal to fetch/enter rates), and delete confirmation.
 *
 * @param tripId - The trip identifier containing the expense
 * @param expenseId - The expense identifier to display
 * @returns The React element tree for the Expense Details screen
 */
function ExpenseDetailsContent({
  tripId,
  expenseId,
}: {
  tripId: string;
  expenseId: string;
}) {
  const router = useRouter();
  const navigation = useNavigation();
  const { displayCurrency } = useDisplayCurrency();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(false);
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [conversionError, setConversionError] = useState<{
    fromCurrency: string;
    toCurrency: string;
  } | null>(null);

  const {
    expense,
    splits,
    loading: expenseLoading,
    error: expenseError,
    refetch: refetchExpense,
  } = useExpenseWithSplits(expenseId);
  const {
    participants,
    loading: participantsLoading,
    refetch: refetchParticipants,
  } = useParticipants(tripId);
  const { categories } = useExpenseCategories(tripId);

  // FX rate staleness detection and refresh
  const {
    isStale,
    daysOld,
    refreshing: fxRefreshing,
    refreshNow: refreshFxRates,
  } = useFxSync({ autoRefresh: false });

  // Pull-to-refresh support (note: categories hook doesn't expose refetch, uses dependency-based refresh)
  const refreshControl = useRefreshControl([
    refetchExpense,
    refetchParticipants,
  ]);

  // Update native header title
  useEffect(() => {
    if (expense) {
      navigation.setOptions({
        title: expense.description,
      });
    }
  }, [expense, navigation]);

  // Map participant IDs to names
  const participantMap = useMemo(() => {
    const map = new Map<string, string>();
    participants.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [participants]);

  // Find the category for this expense
  const expenseCategory = useMemo(() => {
    if (!expense) return null;
    return categories.find((c) => c.id === expense.categoryId);
  }, [expense, categories]);

  // Compute per-participant portions in trip currency minor units
  const splitPortions = useMemo(() => {
    if (!expense) return new Map<string, number>();

    const totalAmount = expense.convertedAmountMinor;
    const equalCount =
      splits.filter((s) => s.shareType === "equal").length || 1;
    const totalWeight = splits
      .filter((s) => s.shareType === "weight")
      .reduce((sum, s) => sum + s.share, 0);

    const portions = new Map<string, number>();

    splits.forEach((split) => {
      let portion: number | null = null;

      if (split.shareType === "amount" && split.amount != null) {
        portion = split.amount;
      } else if (split.shareType === "percentage") {
        portion = Math.round((split.share / 100) * totalAmount);
      } else if (split.shareType === "weight") {
        if (totalWeight > 0) {
          portion = Math.round((split.share / totalWeight) * totalAmount);
        }
      } else if (split.shareType === "equal") {
        portion = Math.round(totalAmount / equalCount);
      }

      if (portion != null) {
        portions.set(split.participantId, portion);
      }
    });

    return portions;
  }, [expense, splits]);

  // Calculate display currency amounts if requested
  const displayAmountsResult = useMemo(() => {
    if (!expense || !displayCurrency) return { amounts: null, error: null };

    try {
      // Convert expense amounts to display currency
      const fxRate = cachedFxRateProvider.getRate(
        expense.currency,
        displayCurrency,
      );

      return {
        amounts: {
          originalAmount:
            expense.originalAmountMinor !== expense.convertedAmountMinor
              ? {
                  amount: expense.originalAmountMinor,
                  currency: expense.originalCurrency,
                }
              : null,
          convertedAmount: {
            amount: expense.convertedAmountMinor,
            currency: expense.currency,
          },
          displayAmount: {
            amount: Math.round(expense.convertedAmountMinor * fxRate),
            currency: displayCurrency,
          },
          fxRate,
        },
        error: null,
      };
    } catch (error) {
      currencyLogger.warn("Failed to convert to display currency", error);
      // Return error for modal
      return {
        amounts: null,
        error: expense
          ? {
              fromCurrency: expense.currency,
              toCurrency: displayCurrency,
            }
          : null,
      };
    }
  }, [expense, displayCurrency]);

  const displayAmounts = displayAmountsResult.amounts;

  // Update conversion error state in useEffect to avoid state updates during render
  useEffect(() => {
    setConversionError(displayAmountsResult.error);
  }, [displayAmountsResult.error]);

  const loading = expenseLoading || participantsLoading;

  // Show modal when conversion error occurs
  useEffect(() => {
    if (conversionError) {
      setRateModalVisible(true);
    }
  }, [conversionError]);

  // Handlers for FX rate recovery
  const handleFetchOnline = async () => {
    try {
      await refreshFxRates();
      setRateModalVisible(false);
      // Trigger re-render by updating state
      setConversionError(null);
    } catch (error) {
      console.error("Failed to refresh rates:", error);
    }
  };

  const handleEnterManually = () => {
    setRateModalVisible(false);
    if (conversionError) {
      router.push(
        `/fx-rates/manual?from=${conversionError.fromCurrency}&to=${conversionError.toCurrency}`,
      );
    }
  };

  const handleRefreshStaleRates = async () => {
    try {
      await refreshFxRates();
      // Trigger re-render
      setConversionError(null);
    } catch (error) {
      console.error("Failed to refresh stale rates:", error);
    }
  };

  // Loading state
  if (loading) {
    return <LoadingScreen message="Loading expense..." />;
  }

  // Error state
  if (expenseError || !expense) {
    return (
      <ErrorScreen
        title="Error Loading Expense"
        message={expenseError?.message || "Expense not found"}
        actionLabel="Back to list"
        onAction={() => router.replace(`/trips/${tripId}/expenses`)}
      />
    );
  }

  const paidByName = participantMap.get(expense.paidBy) || "Unknown";
  const showCurrencyConversion = expense.originalCurrency !== expense.currency;
  const showDisplayCurrency = !!displayAmounts;

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      await deleteExpense(expenseId);
      router.back();
    } catch {
      Alert.alert("Error", "Failed to delete expense");
      setIsDeleting(false);
    }
  };

  return (
    <View style={theme.commonStyles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
      >
        {/* Staleness Warning Banner */}
        {isStale && daysOld && showDisplayCurrency && expense && (
          <StalenessWarningBanner
            currencyPair={`${expense.currency} → ${displayCurrency}`}
            daysOld={daysOld}
            onRefresh={handleRefreshStaleRates}
            refreshing={fxRefreshing}
          />
        )}

        {/* Main Expense Info */}
        <Card style={styles.section}>
          <View style={styles.header}>
            <Text style={styles.sectionTitle} numberOfLines={0}>
              {expense.description}
            </Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={() =>
                  router.push(`/trips/${tripId}/expenses/${expenseId}/edit`)
                }
                style={styles.editButton}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Edit expense"
                accessibilityHint="Opens the edit expense screen"
              >
                <AntDesign name="edit" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditingExpense(!editingExpense)}
                style={[
                  styles.editButton,
                  editingExpense && styles.deleteButtonActive,
                ]}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={
                  editingExpense ? "Cancel delete" : "Delete expense"
                }
                accessibilityHint={
                  editingExpense
                    ? "Hides the delete option"
                    : "Shows the delete option"
                }
              >
                <AntDesign
                  name="delete"
                  size={18}
                  color={
                    editingExpense ? theme.colors.text : theme.colors.primary
                  }
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Original Amount (if different from trip currency) */}
          {showCurrencyConversion && (
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Original amount:</Text>
              <Text style={styles.amount}>
                {formatCurrency(
                  expense.originalAmountMinor,
                  expense.originalCurrency,
                )}
              </Text>
            </View>
          )}

          {/* Converted Amount (trip currency) */}
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>
              {showCurrencyConversion
                ? "Converted to trip currency:"
                : "Amount:"}
            </Text>
            <Text style={[styles.amount, styles.primaryAmount]}>
              {formatCurrency(expense.convertedAmountMinor, expense.currency)}
            </Text>
          </View>

          {/* Display Currency Amount */}
          {showDisplayCurrency && displayAmounts && (
            <View style={styles.amountRow}>
              <Text style={styles.displayLabel}>Display currency:</Text>
              <Text style={styles.displayAmount}>
                {formatCurrency(
                  displayAmounts.displayAmount.amount,
                  displayAmounts.displayAmount.currency,
                )}
              </Text>
            </View>
          )}

          {/* Exchange Rate Info */}
          {showCurrencyConversion && expense.fxRateToTrip && (
            <View style={styles.fxRateRow}>
              <Text style={styles.fxRateText}>
                Exchange rate: 1 {expense.originalCurrency} ={" "}
                {expense.fxRateToTrip.toFixed(4)} {expense.currency}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Paid by:</Text>
            <Pressable
              onPress={() =>
                router.push(`/trips/${tripId}/participants/${expense.paidBy}`)
              }
              accessibilityRole="button"
              accessibilityLabel={`View ${paidByName} details`}
            >
              <Text style={[styles.metaValue, styles.linkText]}>
                {paidByName}
              </Text>
            </Pressable>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Date:</Text>
            <Text style={styles.metaValue}>
              {new Date(expense.date).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Category:</Text>
            <View style={styles.categoryValueRow}>
              {expenseCategory && (
                <View style={styles.categoryIconContainer}>
                  {getCategoryIcon({
                    categoryName: expenseCategory.name,
                    size: 20,
                  })}
                </View>
              )}
              <Text style={styles.metaValue}>
                {expenseCategory?.name || "Uncategorized"}
              </Text>
            </View>
          </View>

          {expense.notes ? (
            <View style={styles.notesRow}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>{expense.notes}</Text>
            </View>
          ) : null}
        </Card>

        {/* Splits Section */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Split Details</Text>
          {splits.length > 0 ? (
            splits.map((split) => {
              const participantName =
                participantMap.get(split.participantId) || "Unknown";
              const portion = splitPortions.get(split.participantId);
              return (
                <View key={split.id} style={styles.splitRow}>
                  <View style={styles.splitInfo}>
                    <Pressable
                      onPress={() =>
                        router.push(
                          `/trips/${tripId}/participants/${split.participantId}`,
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`View ${participantName} details`}
                    >
                      <Text style={[styles.splitName, styles.linkText]}>
                        {participantName}
                      </Text>
                    </Pressable>
                    <Text style={styles.splitType}>
                      {split.shareType === "equal" && "Equal share"}
                      {split.shareType === "percentage" && `${split.share}%`}
                      {split.shareType === "weight" && `Weight: ${split.share}`}
                      {split.shareType === "amount" && "Fixed amount"}
                    </Text>
                  </View>
                  <View style={styles.splitAmounts}>
                    {portion !== undefined && (
                      <>
                        <Text style={styles.splitAmount}>
                          {formatCurrency(portion, expense.currency)}
                        </Text>
                        {showDisplayCurrency && displayAmounts && (
                          <Text style={styles.displayAmountSmall}>
                            {formatCurrency(
                              Math.round(portion * displayAmounts.fxRate),
                              displayAmounts.displayAmount.currency,
                            )}
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No split information available</Text>
          )}
        </Card>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoText}>
            All amounts are stored in cents to avoid floating-point errors.
            {showCurrencyConversion &&
              " Currency conversions are applied at the time of expense creation."}
          </Text>
        </Card>

        {/* Danger Zone - Only show when editing */}
        {editingExpense && (
          <Card style={styles.deleteCard}>
            <Text style={styles.deleteWarning}>Danger Zone</Text>
            <Text style={styles.deleteDescription}>
              Deleting this expense will permanently remove it and all its split
              data. This action cannot be undone.
            </Text>
            <Button
              title={isDeleting ? "Deleting..." : "Delete Expense"}
              onPress={handleDelete}
              fullWidth
              disabled={isDeleting}
            />
          </Card>
        )}
      </ScrollView>

      <NoRateAvailableModal
        visible={rateModalVisible}
        fromCurrency={conversionError?.fromCurrency ?? ""}
        toCurrency={conversionError?.toCurrency ?? ""}
        onFetchOnline={handleFetchOnline}
        onEnterManually={handleEnterManually}
        onDismiss={() => setRateModalVisible(false)}
        fetching={fxRefreshing}
      />

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Expense"
        message={`Delete "${expense.description}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        loading={isDeleting}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  headerButtons: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  editButton: {
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  deleteButtonActive: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  errorText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  section: {
    backgroundColor: theme.colors.surfaceElevated,
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    flexShrink: 1,
    flexGrow: 1,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  amountLabel: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  amount: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  primaryAmount: {
    fontSize: theme.typography.xl,
    color: theme.colors.primary,
  },
  displayLabel: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },
  displayAmount: {
    fontSize: theme.typography.base,
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },
  displayAmountSmall: {
    fontSize: theme.typography.xs,
    color: theme.colors.textMuted,
    fontStyle: "italic",
    textAlign: "right",
    flexShrink: 1,
  },
  fxRateRow: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  fxRateText: {
    fontSize: theme.typography.xs,
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  metaLabel: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  metaValue: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    fontWeight: theme.typography.medium,
  },
  categoryValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  categoryIconContainer: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  linkText: {
    color: theme.colors.primary,
    textDecorationLine: "underline",
  },
  notesRow: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  notesLabel: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  notesText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    lineHeight: 20,
  },
  splitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  splitInfo: {
    flex: 1,
    gap: 2,
    marginRight: theme.spacing.md,
  },
  splitName: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    fontWeight: theme.typography.medium,
  },
  splitType: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
  },
  splitAmounts: {
    alignItems: "flex-end",
    gap: 2,
    minWidth: 120,
    flexShrink: 1,
    flexBasis: "45%",
  },
  splitAmount: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    textAlign: "right",
    flexShrink: 1,
  },
  emptyText: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingVertical: theme.spacing.lg,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
  },
  infoText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  deleteCard: {
    backgroundColor: "#1a0000",
    borderColor: theme.colors.error,
    borderWidth: 2,
  },
  deleteWarning: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
    textAlign: "center",
  },
  deleteDescription: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
    textAlign: "center",
  },
});