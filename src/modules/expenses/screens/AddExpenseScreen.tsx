/**
 * EXPENSES MODULE - Add Expense Screen
 * UI/UX ENGINEER: Screen for creating new expenses
 */

import React, { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { normalizeRouteParam } from "@utils/route-params";
import { LoadingScreen, ErrorScreen } from "@ui/components";
import { useTripById } from "../../trips/hooks/use-trips";
import { useParticipants } from "../../participants/hooks/use-participants";
import { useExpenseCategories } from "../hooks/use-expense-categories";
import { addExpense } from "../repository";
import { ExpenseForm, ExpenseFormData } from "../components/ExpenseForm";

export default function AddExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const normalizedTripId = React.useMemo(
    () => normalizeRouteParam(params.id),
    [params.id],
  );

  if (!normalizedTripId) {
    return (
      <ErrorScreen
        title="Invalid Trip"
        message="No trip ID provided. Please select a trip first."
        actionLabel="Back to trips"
        onAction={() => router.replace("/")}
      />
    );
  }

  return <AddExpenseScreenContent tripId={normalizedTripId} />;
}

function AddExpenseScreenContent({ tripId }: { tripId: string }) {
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

  const [isCreating, setIsCreating] = useState(false);

  // Update native header title
  useEffect(() => {
    if (trip) {
      navigation.setOptions({
        title: `Add Expense - ${trip.name}`,
      });
    }
  }, [trip, navigation]);

  const handleSubmit = async (data: ExpenseFormData) => {
    setIsCreating(true);
    try {
      await addExpense({
        tripId,
        description: data.description,
        notes: data.notes,
        originalAmountMinor: data.amountMinor,
        originalCurrency: data.currency,
        paidBy: data.paidBy,
        categoryId: data.categoryId,
        date: data.date,
        splits: data.splits,
      });

      router.back();
    } catch (error) {
      throw error; // Let ExpenseForm handle the error display
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const loading = tripLoading || participantsLoading || categoriesLoading;

  if (loading) {
    return <LoadingScreen />;
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

  if (!trip || participants.length === 0) {
    return (
      <ErrorScreen
        title={!trip ? "Trip Not Found" : "No Participants"}
        message={
          !trip
            ? "The requested trip could not be found."
            : "Add participants to this trip before creating expenses."
        }
        actionLabel="Back to trip"
        onAction={() => router.back()}
      />
    );
  }

  return (
    <ExpenseForm
      mode="add"
      tripId={tripId}
      tripCurrency={trip.currency}
      tripStartDate={trip.startDate}
      participants={participants}
      categories={categories}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={isCreating}
    />
  );
}
