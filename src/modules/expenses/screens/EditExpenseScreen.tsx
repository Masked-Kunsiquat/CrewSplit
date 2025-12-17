/**
 * EXPENSES MODULE - Edit Expense Screen
 * UI/UX ENGINEER: Screen for editing existing expenses with advanced split interface
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
} from "@ui/components";
import { useTripById } from "../../trips/hooks/use-trips";
import { useParticipants } from "../../participants/hooks/use-participants";
import { useExpenseCategories } from "../hooks/use-expense-categories";
import { useExpenseWithSplits } from "../hooks/use-expenses";
import { useUpdateExpense } from "../hooks/use-expense-mutations";
import { parseCurrency } from "@utils/currency";

// Checkbox component for Personal Expense toggle
function Checkbox({
  checked,
  onToggle,
  label,
  helperText,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  helperText?: string;
}) {
  return (
    <View style={styles.checkboxContainer}>
      <Pressable
        style={styles.checkboxRow}
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <View style={styles.checkboxInner} />}
        </View>
        <Text style={styles.checkboxLabel}>{label}</Text>
      </Pressable>
      {helperText && <Text style={styles.checkboxHelper}>{helperText}</Text>}
    </View>
  );
}

export default function EditExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string | string[];
    expenseId?: string | string[];
  }>();
  const normalizedTripId = React.useMemo(
    () => normalizeTripIdParam(params.id),
    [params.id],
  );
  const normalizedExpenseId = React.useMemo(
    () => normalizeTripIdParam(params.expenseId),
    [params.expenseId],
  );

  if (!normalizedTripId || !normalizedExpenseId) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>Invalid Request</Text>
          <Text style={styles.errorText}>
            {!normalizedTripId
              ? "No trip ID provided."
              : "No expense ID provided."}
          </Text>
          <Button title="Go back" onPress={() => router.back()} />
        </View>
      </View>
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

  // Basic expense fields
  const [description, setDescription] = useState("");
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

  // Pre-populate form when expense data loads
  useEffect(() => {
    if (!expense || !splits) return;

    setDescription(expense.description);
    // Convert from minor units to major units for display (without currency symbol)
    setAmount((expense.originalAmountMinor / 100).toFixed(2));
    setDate(new Date(expense.date));
    setPaidBy(expense.paidBy);
    setCategoryId(expense.categoryId || "cat-other");

    // Determine split type from first split
    if (splits.length > 0) {
      const firstSplit = splits[0];
      setSplitType(firstSplit.shareType);

      // Check if this is a personal expense (only one split matching the payer)
      if (splits.length === 1 && splits[0].participantId === expense.paidBy) {
        setIsPersonalExpense(true);
      }

      // Pre-populate selected participants
      const selectedIds = new Set(splits.map((s) => s.participantId));
      setSelectedParticipants(selectedIds);

      // Pre-populate split values
      const values: Record<string, string> = {};
      splits.forEach((split) => {
        if (split.shareType === "percentage") {
          values[split.participantId] = split.share.toString();
        } else if (split.shareType === "weight") {
          values[split.participantId] = split.share.toString();
        } else if (split.shareType === "amount" && split.amount !== undefined) {
          // Convert from minor units to major units for display (without currency symbol)
          values[split.participantId] = (split.amount / 100).toFixed(2);
        }
      });
      setSplitValues(values);
    }
  }, [expense, splits]);

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

  // Validation logic
  const validateSplits = (): {
    isValid: boolean;
    error?: string;
    current?: number;
    target?: number;
  } => {
    const selectedCount = selectedParticipants.size;

    if (selectedCount === 0) {
      return { isValid: true }; // Allow zero participants (unallocated expense)
    }

    const expenseAmountMinor = parseCurrency(amount);

    if (splitType === "equal") {
      return { isValid: true }; // Equal splits require no validation
    }

    if (splitType === "weight") {
      // Validate each weight is a finite positive number
      for (const pid of selectedParticipants) {
        const value = parseFloat(splitValues[pid] || "1");
        if (!Number.isFinite(value) || value <= 0) {
          return {
            isValid: false,
            error: "Weights must be positive numbers",
          };
        }
      }
      return { isValid: true };
    }

    if (splitType === "percentage") {
      // Validate each percentage is finite and within 0-100
      for (const pid of selectedParticipants) {
        const value = parseFloat(splitValues[pid] || "0");
        if (!Number.isFinite(value) || value < 0 || value > 100) {
          return {
            isValid: false,
            error: "Each percentage must be between 0 and 100",
          };
        }
      }

      // Check that percentages sum to 100
      const total = Array.from(selectedParticipants).reduce((sum, pid) => {
        const value = parseFloat(splitValues[pid] || "0");
        return sum + value;
      }, 0);

      const isValid = Math.abs(total - 100) < 0.01; // Allow small floating point errors
      return {
        isValid,
        error: isValid
          ? undefined
          : `Percentages must add up to 100% (currently ${total.toFixed(1)}%)`,
        current: total,
        target: 100,
      };
    }

    if (splitType === "amount") {
      // Validate each split amount is finite and non-negative
      for (const pid of selectedParticipants) {
        const valueStr = splitValues[pid] || "0";
        const value = parseCurrency(valueStr);
        if (!Number.isFinite(value) || value < 0) {
          return {
            isValid: false,
            error: "Split amounts must be non-negative",
          };
        }
      }

      // Check that split amounts sum to expense total
      const total = Array.from(selectedParticipants).reduce((sum, pid) => {
        const value = parseCurrency(splitValues[pid] || "0");
        return sum + value;
      }, 0);

      const isValid = total === expenseAmountMinor;
      return {
        isValid,
        error: isValid ? undefined : "Split amounts must equal expense total",
        current: total,
        target: expenseAmountMinor,
      };
    }

    return { isValid: true };
  };

  const validation = validateSplits();

  const handleSave = async () => {
    if (!trip || !paidBy || !expense) {
      Alert.alert(
        "Missing Information",
        "Trip, expense, and payer are required to update an expense.",
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

      // Build splits based on split type with validation
      const updatedSplits = Array.from(selectedParticipants).map(
        (participantId) => {
          if (splitType === "equal") {
            return {
              participantId,
              share: 1,
              shareType: "equal" as const,
            };
          }

          if (splitType === "percentage") {
            const percentage = parseFloat(splitValues[participantId] || "0");
            // Validate percentage is finite and within bounds
            if (
              !Number.isFinite(percentage) ||
              percentage < 0 ||
              percentage > 100
            ) {
              throw new Error("Each percentage must be between 0 and 100");
            }
            return {
              participantId,
              share: percentage,
              shareType: "percentage" as const,
            };
          }

          if (splitType === "weight") {
            const weight = parseFloat(splitValues[participantId] || "1");
            // Validate weight is finite and positive
            if (!Number.isFinite(weight) || weight <= 0) {
              throw new Error("Weights must be positive numbers");
            }
            return {
              participantId,
              share: weight,
              shareType: "weight" as const,
            };
          }

          if (splitType === "amount") {
            const splitAmount = parseCurrency(
              splitValues[participantId] || "0",
            );
            // Validate amount is finite and non-negative
            if (!Number.isFinite(splitAmount) || splitAmount < 0) {
              throw new Error("Split amounts must be non-negative");
            }
            return {
              participantId,
              share: 0, // Not used for amount type
              shareType: "amount" as const,
              amount: splitAmount,
            };
          }

          // Fallback (should never reach here)
          return {
            participantId,
            share: 1,
            shareType: "equal" as const,
          };
        },
      );

      // Additional validation for percentage sum
      if (splitType === "percentage") {
        const totalPercentage = updatedSplits.reduce(
          (sum, split) => sum + split.share,
          0,
        );
        if (Math.abs(totalPercentage - 100) >= 0.01) {
          Alert.alert(
            "Invalid Split",
            `Percentages must add up to 100% (currently ${totalPercentage.toFixed(1)}%)`,
          );
          return;
        }
      }

      // Additional validation for amount sum
      if (splitType === "amount") {
        const totalAmount = updatedSplits.reduce(
          (sum, split) => sum + (split.amount || 0),
          0,
        );
        if (totalAmount !== amountMinor) {
          Alert.alert(
            "Invalid Split",
            "Split amounts must equal expense total",
          );
          return;
        }
      }

      const result = await update(expenseId, {
        description: description.trim(),
        originalAmountMinor: amountMinor,
        originalCurrency: expense.originalCurrency ?? trip.currency,
        paidBy,
        categoryId,
        date: date.toISOString(),
        splits: updatedSplits,
      });

      if (result) {
        // Navigate back to expense details
        router.back();
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update expense");
    }
  };

  const loading =
    tripLoading || participantsLoading || expenseLoading || categoriesLoading;
  const isSaving = updateLoading;

  const canSubmit =
    !isSaving &&
    description.trim().length > 0 &&
    amount.trim().length > 0 &&
    paidBy !== null &&
    validation.isValid;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading expense...</Text>
        </View>
      </View>
    );
  }

  // Handle categories error
  if (categoriesError) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>Failed to Load Categories</Text>
          <Text style={styles.errorText}>
            {categoriesError.message ||
              "Unable to load expense categories. Please try again."}
          </Text>
          <Button title="Go back" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  if (!trip || participants.length === 0 || !expense) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>
            {!trip
              ? "Trip Not Found"
              : !expense
                ? "Expense Not Found"
                : "No Participants"}
          </Text>
          <Text style={styles.errorText}>
            {!trip
              ? "The requested trip could not be found."
              : !expense
                ? "The requested expense could not be found."
                : "Add participants to this trip before editing expenses."}
          </Text>
          <Button title="Go back" onPress={() => router.back()} />
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
          editable={!isSaving}
        />

        <View style={styles.row}>
          <View style={styles.halfColumn}>
            <Input
              label={`Amount (${trip.currency})`}
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              editable={!isSaving}
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
              options={
                categories.length > 0
                  ? categories.map((cat) => ({
                      label: `${cat.emoji} ${cat.name}`,
                      value: cat.id,
                    }))
                  : [{ label: "📝 Other", value: "cat-other" }]
              }
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
          disabled={isSaving}
        />
        <View style={{ height: theme.spacing.md }} />
        <Button
          title={isSaving ? "Saving..." : "Save Changes"}
          onPress={handleSave}
          fullWidth
          disabled={!canSubmit}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function normalizeTripIdParam(idParam: string | string[] | undefined) {
  if (!idParam) return null;
  const firstValue = Array.isArray(idParam) ? idParam[0] : idParam;
  const normalized = firstValue.trim();
  return normalized.length > 0 ? normalized : null;
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
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  loadingText: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
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
  participantList: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    overflow: "hidden",
  },
  checkboxContainer: {
    marginBottom: theme.spacing.md,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  checkboxChecked: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: theme.colors.text,
  },
  checkboxLabel: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    fontWeight: theme.typography.medium,
  },
  checkboxHelper: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
    marginLeft: 40, // Align with label after checkbox
    marginTop: theme.spacing.xs,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
