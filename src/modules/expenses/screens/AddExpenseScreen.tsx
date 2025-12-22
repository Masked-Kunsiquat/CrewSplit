/**
 * EXPENSES MODULE - Add Expense Screen
 * UI/UX ENGINEER: Screen for creating new expenses with advanced split interface
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { theme } from "@ui/theme";
import {
  Button,
  Input,
  DatePicker,
  Picker,
  PickerOption,
  ParticipantSplitRow,
  SplitValidationSummary,
  SplitType,
  Checkbox,
} from "@ui/components";
import { useTripById } from "../../trips/hooks/use-trips";
import { useParticipants } from "../../participants/hooks/use-participants";
import { useExpenseCategories } from "../hooks/use-expense-categories";
import { addExpense } from "../repository";
import { parseCurrency } from "@utils/currency";
import { getCategoryIcon } from "@utils/category-icons";
import { normalizeRouteParam } from "@utils/route-params";
import { validateExpenseSplits } from "../utils/validate-splits";
import { buildExpenseSplits, validateSplitTotals } from "../utils/build-expense-splits";

export default function AddExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const normalizedTripId = React.useMemo(
    () => normalizeRouteParam(params.id),
    [params.id],
  );

  if (!normalizedTripId) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>Invalid Trip</Text>
          <Text style={styles.errorText}>
            No trip ID provided. Please select a trip first.
          </Text>
          <Button title="Back to trips" onPress={() => router.replace("/")} />
        </View>
      </View>
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
  const { categories, loading: categoriesLoading } =
    useExpenseCategories(tripId);

  // Update native header title
  useEffect(() => {
    if (trip) {
      navigation.setOptions({
        title: `Add Expense - ${trip.name}`,
      });
    }
  }, [trip, navigation]);

  // Basic expense fields
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date());
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string>("cat-other"); // Default to "Other"

  // Split configuration
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [isPersonalExpense, setIsPersonalExpense] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(
    new Set(),
  );
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});

  const [isCreating, setIsCreating] = useState(false);

  // Auto-select first participant as payer if not set
  useEffect(() => {
    if (participants.length > 0 && !paidBy) {
      setPaidBy(participants[0].id);
    }
  }, [participants, paidBy]);

  // Handle personal expense toggle
  useEffect(() => {
    if (isPersonalExpense && paidBy) {
      // Auto-select only the payer
      setSelectedParticipants(new Set([paidBy]));
    } else if (isPersonalExpense && !paidBy) {
      // Clear selection if no payer
      setSelectedParticipants(new Set());
    }
  }, [isPersonalExpense, paidBy]);

  // Update selection when payer changes in personal expense mode
  useEffect(() => {
    if (isPersonalExpense && paidBy) {
      setSelectedParticipants(new Set([paidBy]));
    }
  }, [paidBy, isPersonalExpense]);

  const handleToggleParticipant = (participantId: string) => {
    if (isPersonalExpense) return; // Don't allow manual toggle in personal mode

    setSelectedParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
        // Remove split value when unselecting using functional updater
        setSplitValues((prevValues) => {
          const copy = { ...prevValues };
          delete copy[participantId];
          return copy;
        });
      } else {
        next.add(participantId);
      }
      return next;
    });
  };

  const handleSplitValueChange = (participantId: string, value: string) => {
    setSplitValues((prev) => ({
      ...prev,
      [participantId]: value,
    }));
  };

  const handlePaidByChange = (newPayerId: string) => {
    setPaidBy(newPayerId);
  };

  const handlePersonalExpenseToggle = () => {
    const newValue = !isPersonalExpense;
    setIsPersonalExpense(newValue);

    if (!newValue) {
      // When unchecking, clear all selections
      setSelectedParticipants(new Set());
    }
  };

  // Validation using extracted utility
  const validation = validateExpenseSplits(
    selectedParticipants,
    splitType,
    splitValues,
    amount,
  );

  const handleCreate = async () => {
    if (!trip || !paidBy) {
      Alert.alert(
        "Missing Information",
        "Trip and payer are required to create an expense.",
      );
      return;
    }

    setIsCreating(true);
    try {
      const amountMinor = parseCurrency(amount);
      if (amountMinor <= 0) {
        Alert.alert(
          "Invalid Amount",
          "Please enter a valid amount greater than zero.",
        );
        setIsCreating(false);
        return;
      }

      if (!validation.isValid) {
        Alert.alert(
          "Invalid Split",
          validation.error || "Please check your split configuration.",
        );
        setIsCreating(false);
        return;
      }

      // Build splits using extracted utility
      const splits = buildExpenseSplits(
        selectedParticipants,
        splitType,
        splitValues,
      );

      // Validate split totals using extracted utility
      try {
        validateSplitTotals(splits, splitType, amountMinor);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Invalid split configuration";
        Alert.alert("Invalid Split", errorMessage);
        setIsCreating(false);
        return;
      }

      await addExpense({
        tripId,
        description: description.trim(),
        notes: notes.trim().length > 0 ? notes.trim() : null,
        originalAmountMinor: amountMinor,
        originalCurrency: trip.currency,
        paidBy,
        categoryId,
        date: date.toISOString(),
        splits,
      });

      router.back();
    } catch {
      Alert.alert("Error", "Failed to add expense");
    } finally {
      setIsCreating(false);
    }
  };

  const loading = tripLoading || participantsLoading || categoriesLoading;

  const canSubmit =
    !isCreating &&
    description.trim().length > 0 &&
    amount.trim().length > 0 &&
    paidBy !== null &&
    validation.isValid;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!trip || participants.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>
            {!trip ? "Trip Not Found" : "No Participants"}
          </Text>
          <Text style={styles.errorText}>
            {!trip
              ? "The requested trip could not be found."
              : "Add participants to this trip before creating expenses."}
          </Text>
          <Button title="Back to trip" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  // Prepare split type options
  const splitTypeOptions: PickerOption<SplitType>[] = [
    { label: "Equal", value: "equal" },
    { label: "Percentage", value: "percentage" },
    { label: "Weight", value: "weight" },
    { label: "Amount", value: "amount" },
  ];

  // Prepare payer options
  const payerOptions: PickerOption<string>[] = participants.map((p) => ({
    label: p.name,
    value: p.id,
  }));

  const categoryOptions: PickerOption<string>[] =
    categories.length > 0
      ? categories.map((cat) => ({
          label: cat.name,
          value: cat.id,
          icon: (
            <View style={styles.categoryIcon}>
              {getCategoryIcon({
                categoryName: cat.name,
                size: 24,
                color: theme.colors.primary,
              })}
            </View>
          ),
        }))
      : [
          {
            label: "Other",
            value: "cat-other",
            icon: (
              <View style={styles.categoryIcon}>
                {getCategoryIcon({
                  categoryName: "Other",
                  size: 24,
                  color: theme.colors.primary,
                })}
              </View>
            ),
          },
        ];

  // Sort participants alphabetically
  const sortedParticipants = [...participants].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label="What was this?"
          placeholder="e.g., Dinner at Marina"
          value={description}
          onChangeText={setDescription}
          autoFocus
          editable={!isCreating}
        />

        <Input
          label="Notes (optional)"
          placeholder="Add a note or receipt details"
          value={notes}
          onChangeText={setNotes}
          editable={!isCreating}
          multiline
          numberOfLines={3}
          style={styles.notesInput}
        />

        <View style={styles.row}>
          <View style={styles.halfColumn}>
            <Input
              label={`Amount (${trip.currency})`}
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              editable={!isCreating}
            />
          </View>

          <View style={styles.halfColumn}>
            <DatePicker
              label="Date"
              value={date}
              initialDate={trip ? new Date(trip.startDate) : undefined}
              onChange={setDate}
              maximumDate={new Date()}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfColumn}>
            <Picker
              label="Paid by"
              value={paidBy || ""}
              options={payerOptions}
              onChange={handlePaidByChange}
              placeholder="Select payer"
            />
          </View>

          <View style={styles.halfColumn}>
            <Picker
              label="Category"
              value={categoryId}
              options={categoryOptions}
              onChange={setCategoryId}
              placeholder="Select category"
            />
          </View>
        </View>

        <Checkbox
          checked={isPersonalExpense}
          onToggle={handlePersonalExpenseToggle}
          label="Personal Expense"
          helperText="This expense is just for you—no splitting needed"
        />

        <View
          style={[styles.section, !validation.isValid && styles.sectionError]}
        >
          {!validation.isValid && (
            <Text style={styles.sectionErrorText}>{validation.error}</Text>
          )}

          <Picker
            label="Split Type"
            value={splitType}
            options={splitTypeOptions}
            onChange={setSplitType}
          />

          <Text style={styles.sectionLabel}>Participants</Text>
          <Text style={styles.sectionHelper}>
            {isPersonalExpense
              ? "Only the payer is selected for personal expenses"
              : "Tap to select participants in this expense"}
          </Text>

          <View style={styles.participantList}>
            {sortedParticipants.map((participant) => (
              <ParticipantSplitRow
                key={participant.id}
                id={participant.id}
                name={participant.name}
                avatarColor={participant.avatarColor}
                selected={selectedParticipants.has(participant.id)}
                splitType={splitType}
                value={splitValues[participant.id] || ""}
                currency={trip.currency}
                onToggle={handleToggleParticipant}
                onValueChange={handleSplitValueChange}
                disabled={isPersonalExpense}
              />
            ))}
          </View>

          {validation.current !== undefined &&
            validation.target !== undefined && (
              <SplitValidationSummary
                splitType={splitType}
                current={validation.current}
                target={validation.target}
                currency={trip.currency}
                isValid={validation.isValid}
              />
            )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Cancel"
          variant="outline"
          onPress={() => router.back()}
          fullWidth
          disabled={isCreating}
        />
        <View style={{ height: theme.spacing.md }} />
        <Button
          title={isCreating ? "Saving..." : "Save Expense"}
          onPress={handleCreate}
          fullWidth
          disabled={!canSubmit}
        />
      </View>
    </KeyboardAvoidingView>
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
  row: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  halfColumn: {
    flex: 1,
  },
  categoryIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  errorTitle: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  errorText: {
    fontSize: theme.typography.lg,
    color: theme.colors.error,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  section: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: "transparent",
  },
  sectionError: {
    borderColor: theme.colors.error,
  },
  sectionErrorText: {
    fontSize: theme.typography.sm,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
    fontWeight: theme.typography.medium,
  },
  sectionLabel: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  sectionHelper: {
    fontSize: theme.typography.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  notesInput: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  participantList: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    overflow: "hidden",
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
