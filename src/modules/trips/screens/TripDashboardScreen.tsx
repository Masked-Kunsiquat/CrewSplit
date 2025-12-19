/**
 * UI/UX ENGINEER: Trip Dashboard Screen
 * Main dashboard for viewing and managing a trip
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { theme } from "@ui/theme";
import { Button, Card } from "@ui/components";
import { useTripById } from "../hooks/use-trips";
import { useParticipants } from "../../participants/hooks/use-participants";
import { useExpenses } from "../../expenses/hooks/use-expenses";
import { updateTrip, deleteTrip } from "../repository";
import { useRefreshControl } from "@hooks/use-refresh-control";
import {
  TripHeader,
  TripEditForm,
  TripSummaryCard,
  TripActionCards,
  DeleteTripCard,
} from "./components";

export default function TripDashboardScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const tripId = id?.trim() || null;

  if (!tripId) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>
            Invalid trip. Please select a trip again.
          </Text>
          <Button title="Back to trips" onPress={() => router.replace("/")} />
        </View>
      </View>
    );
  }

  return <TripDashboardScreenContent tripId={tripId} />;
}

function TripDashboardScreenContent({ tripId }: { tripId: string }) {
  const router = useRouter();
  const navigation = useNavigation();

  const {
    trip,
    loading: tripLoading,
    error: tripError,
    refetch: refetchTrip,
  } = useTripById(tripId);
  const {
    participants,
    loading: participantsLoading,
    refetch: refetchParticipants,
  } = useParticipants(tripId);
  const {
    expenses,
    loading: expensesLoading,
    refetch: refetchExpenses,
  } = useExpenses(tripId);

  const refetchFunctions = useMemo(
    () => [refetchTrip, refetchParticipants, refetchExpenses],
    [refetchTrip, refetchParticipants, refetchExpenses],
  );

  // Pull-to-refresh support
  const refreshControl = useRefreshControl(refetchFunctions);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [emojiInput, setEmojiInput] = useState<string | undefined>(undefined);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [endDateInput, setEndDateInput] = useState<Date | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [addMenuVisible, setAddMenuVisible] = useState(false);

  // Update native header title when trip loads
  useEffect(() => {
    if (trip) {
      navigation.setOptions({
        title: trip.name,
      });
    }
  }, [trip, navigation]);

  const loading = tripLoading || participantsLoading || expensesLoading;

  // Calculate total expenses
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.convertedAmountMinor,
    0,
  );

  const handleEditName = () => {
    setNameInput(trip?.name || "");
    setEmojiInput(trip?.emoji);
    setEndDateInput(trip?.endDate ? new Date(trip.endDate) : null);
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      Alert.alert("Error", "Trip name cannot be empty");
      return;
    }

    if (endDateInput && trip && endDateInput < new Date(trip.startDate)) {
      Alert.alert(
        "Invalid Dates",
        "End date must be on or after the start date.",
      );
      return;
    }

    try {
      const updated = await updateTrip(tripId, {
        name: nameInput.trim(),
        emoji: emojiInput,
        endDate: endDateInput ? endDateInput.toISOString() : null,
      });
      navigation.setOptions({ title: updated.name });
      refetchTrip();
      setEditingName(false);
    } catch {
      Alert.alert("Error", "Failed to update trip");
    }
  };

  const handleCancelEdit = () => {
    setEditingName(false);
    setNameInput("");
    setEmojiInput(undefined);
    setEndDateInput(null);
  };

  const handleDeleteTrip = () => {
    Alert.alert(
      "Delete Trip",
      `Delete "${trip?.name}"? This will permanently delete all participants, expenses, and settlements for this trip. This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteTrip(tripId);
              router.replace("/");
            } catch {
              Alert.alert("Error", "Failed to delete trip");
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (tripError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{tripError.message}</Text>
          </Card>
        </View>
      </View>
    );
  }

  if (loading || !trip) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
      >
        {editingName ? (
          <TripEditForm
            trip={trip}
            nameInput={nameInput}
            setNameInput={setNameInput}
            emojiInput={emojiInput}
            setEmojiInput={setEmojiInput}
            emojiPickerOpen={emojiPickerOpen}
            setEmojiPickerOpen={setEmojiPickerOpen}
            endDateInput={endDateInput}
            setEndDateInput={setEndDateInput}
            onSave={handleSaveName}
            onCancel={handleCancelEdit}
          />
        ) : (
          <TripHeader trip={trip} onEdit={handleEditName} />
        )}

        <TripSummaryCard
          participantCount={participants.length}
          expenseCount={expenses.length}
          totalExpenses={totalExpenses}
          currency={trip.currency}
        />

        <TripActionCards
          tripId={tripId}
          participantCount={participants.length}
          expenseCount={expenses.length}
          onNavigate={(path) => router.push(path)}
        />

        {editingName && (
          <DeleteTripCard isDeleting={isDeleting} onDelete={handleDeleteTrip} />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="+ Add"
          onPress={() => setAddMenuVisible(true)}
          fullWidth
        />
      </View>

      {/* Add Menu Modal */}
      <Modal
        visible={addMenuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setAddMenuVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New</Text>

            <Pressable
              style={({ pressed }) => [
                styles.menuOption,
                pressed && styles.menuOptionPressed,
              ]}
              onPress={() => {
                setAddMenuVisible(false);
                router.push({
                  pathname: "/trips/[id]/expenses/add",
                  params: { id: tripId },
                });
              }}
            >
              <Text style={styles.menuOptionIcon}>💰</Text>
              <View style={styles.menuOptionText}>
                <Text style={styles.menuOptionTitle}>Add Expense</Text>
                <Text style={styles.menuOptionDescription}>
                  Record a new expense for this trip
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.menuOption,
                pressed && styles.menuOptionPressed,
              ]}
              onPress={() => {
                setAddMenuVisible(false);
                router.push({
                  pathname: "/trips/[id]/settlements/record",
                  params: { id: tripId },
                });
              }}
            >
              <Text style={styles.menuOptionIcon}>💸</Text>
              <View style={styles.menuOptionText}>
                <Text style={styles.menuOptionTitle}>Record Payment</Text>
                <Text style={styles.menuOptionDescription}>
                  Log a payment between participants
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setAddMenuVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  modalTitle: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: theme.spacing.md,
  },
  menuOptionPressed: {
    opacity: 0.7,
    backgroundColor: theme.colors.surfaceElevated,
  },
  menuOptionIcon: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  menuOptionText: {
    flex: 1,
  },
  menuOptionTitle: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  menuOptionDescription: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  cancelButton: {
    padding: theme.spacing.lg,
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  cancelButtonText: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textSecondary,
  },
});
