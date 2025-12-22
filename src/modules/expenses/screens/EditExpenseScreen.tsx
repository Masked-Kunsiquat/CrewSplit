/**
 * EXPENSES MODULE - Edit Expense Screen
 * UI/UX ENGINEER: Screen for editing existing expenses
 */

import React, { useEffect } from "react";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { normalizeRouteParam } from "@utils/route-params";
import { LoadingScreen, ErrorScreen } from "@ui/components";
import { useTripById } from "../../trips/hooks/use-trips";
import { useParticipants } from "../../participants/hooks/use-participants";
import { useExpenseCategories } from "../hooks/use-expense-categories";
import { useExpenseWithSplits } from "../hooks/use-expenses";
import { useUpdateExpense } from "../hooks/use-expense-mutations";
import { ExpenseForm, ExpenseFormData } from "../components/ExpenseForm";

export default function EditExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string | string[];
    expenseId?: string | string[];
  }>();
  const normalizedTripId = React.useMemo(
    () => normalizeRouteParam(params.id),
    [params.id],
  );
  const normalizedExpenseId = React.useMemo(
    () => normalizeRouteParam(params.expenseId),
    [params.expenseId],
  );

  if (!normalizedTripId || !normalizedExpenseId) {
    return (
      <ErrorScreen
        title="Invalid Request"
        message={
          !normalizedTripId ? "No trip ID provided." : "No expense ID provided."
        }
        actionLabel="Go back"
        onAction={() => router.back()}
      />
    );
  }

  return (
    <EditExpenseScreenContent
      tripId={normalizedTripId}
      expenseId={normalizedExpenseId}
    />
  );
}

function EditExpenseScreenContent({
  tripId,
  expenseId,
}: {
  tripId: string;
  expenseId: string;
}) {
  const router = useRouter();
  const navigation = useNavigation();
  const { trip, loading: tripLoading } = useTripById(tripId);
  const { participants, loading: participantsLoading } =
    useParticipants(tripId);
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useExpenseCategories(tripId);
  const {
    expense,
    splits,
    loading: expenseLoading,
  } = useExpenseWithSplits(expenseId);
  const { update, loading: updateLoading } = useUpdateExpense();

  // Update native header title
  useEffect(() => {
    if (trip) {
      navigation.setOptions({
        title: `Edit Expense - ${trip.name}`,
      });
    }
  }, [trip, navigation]);

  const handleSubmit = async (data: ExpenseFormData) => {
    if (!expense) {
      throw new Error("Expense data not loaded");
    }

    const result = await update(expenseId, {
      description: data.description,
      notes: data.notes,
      originalAmountMinor: data.amountMinor,
      originalCurrency: data.currency,
      paidBy: data.paidBy,
      categoryId: data.categoryId,
      date: data.date,
      splits: data.splits,
    });

    if (result) {
      router.back();
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const loading =
    tripLoading || participantsLoading || expenseLoading || categoriesLoading;

  if (loading) {
    return <LoadingScreen message="Loading expense..." />;
  }

  // Handle categories error
  if (categoriesError) {
    return (
      <ErrorScreen
        title="Failed to Load Categories"
        message={
          categoriesError.message ||
          "Unable to load expense categories. Please try again."
        }
        actionLabel="Go back"
        onAction={() => router.back()}
      />
    );
  }

  if (!trip || participants.length === 0 || !expense || !splits) {
    return (
      <ErrorScreen
        title={
          !trip
            ? "Trip Not Found"
            : !expense
              ? "Expense Not Found"
              : "No Participants"
        }
        message={
          !trip
            ? "The requested trip could not be found."
            : !expense
              ? "The requested expense could not be found."
              : "Add participants to this trip before editing expenses."
        }
        actionLabel="Go back"
        onAction={() => router.back()}
      />
    );
  }

  return (
    <ExpenseForm
      mode="edit"
      tripId={tripId}
      tripCurrency={trip.currency}
      tripStartDate={trip.startDate}
      participants={participants}
      categories={categories}
      initialValues={{
        description: expense.description,
        notes: expense.notes,
        amountMinor: expense.originalAmountMinor,
        currency: expense.originalCurrency ?? trip.currency,
        date: expense.date,
        paidBy: expense.paidBy,
        categoryId: expense.categoryId || "cat-other",
        splits,
      }}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={updateLoading}
    />
  );
}
