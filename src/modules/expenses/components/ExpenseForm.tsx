/**
 * EXPENSES MODULE - ExpenseForm Component
 * UI/UX ENGINEER: Reusable form component for creating and editing expenses
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
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
import { getCategoryIcon } from "@utils/category-icons";
import { parseCurrency, CurrencyUtils } from "@utils/currency";
import { validateExpenseSplits } from "../utils/validate-splits";
import {
  buildExpenseSplits,
  validateSplitTotals,
} from "../utils/build-expense-splits";
import type { Participant } from "@modules/participants/types";
import type { ExpenseCategory } from "../types";

export interface ExpenseFormData {
  description: string;
  notes: string | null;
  amountMinor: number;
  currency: string;
  date: string;
  paidBy: string;
  categoryId: string;
  splits: {
    participantId: string;
    shareType: SplitType;
    share: number;
    amount?: number;
  }[];
}

interface ExpenseFormProps {
  mode: "add" | "edit";
  tripId: string;
  tripCurrency: string;
  tripStartDate: string;
  participants: Participant[];
  categories: ExpenseCategory[];
  initialValues?: {
    description: string;
    notes: string | null;
    amountMinor: number;
    currency: string;
    date: string;
    paidBy: string;
    categoryId: string;
    splits: {
      participantId: string;
      shareType: SplitType;
      share: number;
      amount?: number | null;
    }[];
  };
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ExpenseForm({
  mode,
  tripId,
  tripCurrency,
  tripStartDate,
  participants,
  categories,
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: ExpenseFormProps) {
  // Basic expense fields
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date());
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string>("cat-other");

  // Split configuration
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [isPersonalExpense, setIsPersonalExpense] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(
    new Set(),
  );
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});

  // Pre-populate form when initial values are provided (edit mode)
  // Only runs once on mount to avoid resetting form during user edits
  useEffect(() => {
    if (mode !== "edit" || !initialValues) return;

    setDescription(initialValues.description);
    setNotes(initialValues.notes ?? "");

    // Convert minor units to major units using currency-aware utility
    const majorAmount = CurrencyUtils.minorToMajor(
      initialValues.amountMinor,
      initialValues.currency,
    );
    const decimals = CurrencyUtils.getDecimalPlaces(initialValues.currency);
    setAmount(majorAmount.toFixed(decimals));

    setDate(new Date(initialValues.date));
    setPaidBy(initialValues.paidBy);
    setCategoryId(initialValues.categoryId || "cat-other");

    // Determine split type from first split
    if (initialValues.splits.length > 0) {
      const firstSplit = initialValues.splits[0];
      setSplitType(firstSplit.shareType);

      // Check if this is a personal expense
      if (
        initialValues.splits.length === 1 &&
        initialValues.splits[0].participantId === initialValues.paidBy
      ) {
        setIsPersonalExpense(true);
      }

      // Pre-populate selected participants
      const selectedIds = new Set(
        initialValues.splits.map((s) => s.participantId),
      );
      setSelectedParticipants(selectedIds);

      // Pre-populate split values
      const values: Record<string, string> = {};
      const decimals = CurrencyUtils.getDecimalPlaces(initialValues.currency);

      initialValues.splits.forEach((split) => {
        if (split.shareType === "percentage") {
          values[split.participantId] = split.share.toString();
        } else if (split.shareType === "weight") {
          values[split.participantId] = split.share.toString();
        } else if (
          split.shareType === "amount" &&
          split.amount !== undefined &&
          split.amount !== null
        ) {
          // Convert minor units to major units using currency-aware utility
          const majorAmount = CurrencyUtils.minorToMajor(
            split.amount,
            initialValues.currency,
          );
          values[split.participantId] = majorAmount.toFixed(decimals);
        }
      });
      setSplitValues(values);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]); // Only run once on mount - initialValues is intentionally excluded

  // Auto-select first participant as payer if not set (add mode only)
  useEffect(() => {
    if (mode === "add" && participants.length > 0 && !paidBy) {
      setPaidBy(participants[0].id);
    }
  }, [mode, participants, paidBy]);

  // Handle personal expense toggle - auto-select payer when in personal mode
  useEffect(() => {
    if (isPersonalExpense && paidBy) {
      setSelectedParticipants(new Set([paidBy]));
    } else if (isPersonalExpense && !paidBy) {
      setSelectedParticipants(new Set());
    }
  }, [isPersonalExpense, paidBy]);

  const handleToggleParticipant = (participantId: string) => {
    if (isPersonalExpense) return;

    setSelectedParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
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
      setSelectedParticipants(new Set());
    }
  };

  // Validation
  const validation = validateExpenseSplits(
    selectedParticipants,
    splitType,
    splitValues,
    amount,
  );

  const handleSubmit = async () => {
    if (!paidBy) {
      Alert.alert(
        "Missing Information",
        "Please select who paid for this expense.",
      );
      return;
    }

    try {
      const amountMinor = parseCurrency(amount);
      if (amountMinor <= 0) {
        Alert.alert(
          "Invalid Amount",
          "Please enter a valid amount greater than zero.",
        );
        return;
      }

      if (!validation.isValid) {
        Alert.alert(
          "Invalid Split",
          validation.error || "Please check your split configuration.",
        );
        return;
      }

      const splits = buildExpenseSplits(
        selectedParticipants,
        splitType,
        splitValues,
      );

      try {
        validateSplitTotals(splits, splitType, amountMinor);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Invalid split configuration";
        Alert.alert("Invalid Split", errorMessage);
        return;
      }

      await onSubmit({
        description: description.trim(),
        notes: notes.trim().length > 0 ? notes.trim() : null,
        amountMinor,
        currency: initialValues?.currency ?? tripCurrency,
        date: date.toISOString(),
        paidBy,
        categoryId,
        splits,
      });
    } catch (error) {
      console.error("Failed to submit expense", error);
      const message =
        error instanceof Error ? error.message : "Failed to save expense";
      Alert.alert("Error", message);
    }
  };

  const canSubmit =
    !isSubmitting &&
    description.trim().length > 0 &&
    amount.trim().length > 0 &&
    paidBy !== null &&
    validation.isValid;

  // Prepare options
  const splitTypeOptions: PickerOption<SplitType>[] = [
    { label: "Equal", value: "equal" },
    { label: "Percentage", value: "percentage" },
    { label: "Weight", value: "weight" },
    { label: "Amount", value: "amount" },
  ];

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

  const sortedParticipants = [...participants].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <KeyboardAvoidingView
      style={theme.commonStyles.container}
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
          autoFocus={mode === "add"}
          editable={!isSubmitting}
        />

        <Input
          label="Notes (optional)"
          placeholder="Add a note or receipt details"
          value={notes}
          onChangeText={setNotes}
          editable={!isSubmitting}
          multiline
          numberOfLines={3}
          style={styles.notesInput}
        />

        <View style={styles.row}>
          <View style={styles.halfColumn}>
            <Input
              label={`Amount (${tripCurrency})`}
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.halfColumn}>
            <DatePicker
              label="Date"
              value={date}
              initialDate={new Date(tripStartDate)}
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
                currency={tripCurrency}
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
                currency={tripCurrency}
                isValid={validation.isValid}
              />
            )}
        </View>
      </ScrollView>

      <View style={theme.commonStyles.footer}>
        <Button
          title="Cancel"
          variant="outline"
          onPress={onCancel}
          fullWidth
          disabled={isSubmitting}
        />
        <View style={{ height: theme.spacing.md }} />
        <Button
          title={
            isSubmitting
              ? "Saving..."
              : mode === "add"
                ? "Save Expense"
                : "Save Changes"
          }
          onPress={handleSubmit}
          fullWidth
          disabled={!canSubmit}
        />
      </View>
    </KeyboardAvoidingView>
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
});
