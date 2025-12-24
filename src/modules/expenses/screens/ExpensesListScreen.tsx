import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { theme } from "@ui/theme";
import { Button, Card, LoadingScreen } from "@ui/components";
import { useExpenses } from "../hooks/use-expenses";
import { useExpenseCategories } from "../hooks/use-expense-categories";
import { useTripById } from "../../trips/hooks/use-trips";
import { formatCurrency } from "@utils/currency";
import { useRefreshControl } from "@hooks/use-refresh-control";
import { getCategoryIcon } from "@utils/category-icons";

/**
 * Render the expenses list screen for a trip, including filters, pull-to-refresh, and navigation.
 *
 * Displays loading and error states, a horizontal category filter bar, a scrollable list of expenses
 * (filtered by provided IDs and selected category), and a footer button to add a new expense.
 *
 * @returns A React element representing the expenses list screen UI.
 */
export default function ExpensesListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const {
    id: tripId,
    filter,
    ids,
  } = useLocalSearchParams<{
    id: string;
    filter?: string;
    ids?: string;
  }>();

  const { trip, refetch: refetchTrip } = useTripById(tripId);
  const {
    expenses,
    loading,
    error,
    refetch: refetchExpenses,
  } = useExpenses(tripId);
  const { categories } = useExpenseCategories(tripId);

  // Pull-to-refresh support (note: categories hook doesn't expose refetch, uses dependency-based refresh)
  const refreshControl = useRefreshControl([refetchTrip, refetchExpenses]);

  // Category filter state - null means "All"
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  // Parse filter IDs if provided
  const filterIds = ids ? ids.split(",").map((id) => id.trim()) : null;

  // Filter expenses by IDs first, then by category
  let displayedExpenses = filterIds
    ? expenses.filter((expense) => filterIds.includes(expense.id))
    : expenses;

  // Apply category filter if selected
  if (selectedCategoryId) {
    displayedExpenses = displayedExpenses.filter(
      (expense) => expense.categoryId === selectedCategoryId,
    );
  }

  // Determine header title based on filter
  const headerTitle =
    filter === "unsplit"
      ? "Unsplit Expenses"
      : trip
        ? `${trip.name} - Expenses`
        : "Expenses";

  // Update native header title
  useEffect(() => {
    navigation.setOptions({
      title: headerTitle,
    });
  }, [headerTitle, navigation]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <View style={theme.commonStyles.container}>
        <View style={styles.errorContainer}>
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error.message}</Text>
          </Card>
        </View>
      </View>
    );
  }

  return (
    <View style={theme.commonStyles.container}>
      {/* Category Filter */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {/* "All" filter */}
          <Pressable
            style={[
              styles.filterChip,
              selectedCategoryId === null && styles.filterChipActive,
            ]}
            onPress={() => setSelectedCategoryId(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategoryId === null && styles.filterChipTextActive,
              ]}
            >
              All
            </Text>
          </Pressable>

          {/* Category filters */}
          {categories.map((category) => (
            <Pressable
              key={category.id}
              style={[
                styles.filterChip,
                selectedCategoryId === category.id && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategoryId(category.id)}
              accessibilityLabel={`Filter by ${category.name}`}
            >
              <View style={styles.filterIconContainer}>
                {getCategoryIcon({
                  categoryName: category.name,
                  size: 24,
                })}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
      >
        {displayedExpenses.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {filterIds ? "No matching expenses" : "No expenses yet"}
            </Text>
            <Text style={styles.emptyText}>
              {filterIds
                ? "The filtered expenses are not available."
                : "Add your first expense to start tracking shared costs."}
            </Text>
          </Card>
        ) : (
          displayedExpenses.map((expense) => {
            const category = categories.find(
              (c) => c.id === expense.categoryId,
            );
            return (
              <Card
                key={expense.id}
                style={styles.expenseCard}
                onPress={() =>
                  router.push(`/trips/${tripId}/expenses/${expense.id}`)
                }
              >
                <View style={styles.expenseHeader}>
                  <View style={styles.expenseTitleRow}>
                    {category && (
                      <View style={styles.categoryIconContainer}>
                        {getCategoryIcon({
                          categoryName: category.name,
                          size: 20,
                        })}
                      </View>
                    )}
                    <Text style={styles.expenseTitle}>
                      {expense.description}
                    </Text>
                  </View>
                  <Text style={styles.expenseAmount}>
                    {formatCurrency(
                      expense.convertedAmountMinor,
                      trip?.currency || "USD",
                    )}
                  </Text>
                </View>
                <Text style={styles.expenseMeta}>
                  {new Date(expense.date).toLocaleDateString()}
                  {category ? ` • ${category.name}` : ""}
                </Text>
              </Card>
            );
          })
        )}
      </ScrollView>

      <View style={theme.commonStyles.footer}>
        <Button
          title="Add Expense"
          onPress={() => router.push(`/trips/${tripId}/expenses/add`)}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.xxxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  errorContainer: {
    padding: theme.spacing.lg,
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
  expenseCard: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  expenseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  expenseTitleRow: {
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
  expenseTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    flex: 1,
  },
  expenseAmount: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.primary,
  },
  expenseMeta: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  filterScroll: {
    maxHeight: 48, // Constrain height to prevent extra spacing
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  filterContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 32, // Material Design 3 spec: 32px height
    paddingHorizontal: 12, // Material Design 3 spec: 12dp horizontal padding
    borderRadius: 16, // Half of height for pill shape
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.primary,
  },
  filterIconContainer: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipText: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    color: theme.colors.text,
    lineHeight: 18,
  },
  filterChipTextActive: {
    color: theme.colors.primary,
  },
});