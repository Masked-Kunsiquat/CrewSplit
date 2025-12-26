import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EmojiPicker from "rn-emoji-keyboard";
import { theme } from "@ui/theme";
import { Button, Input, CurrencyPicker, DateRangePicker } from "@ui/components";
import { useCreateTrip } from "../hooks/use-trip-mutations";
import { useAddParticipant } from "../../participants/hooks/use-participant-mutations";
import { useDeviceOwner } from "@modules/onboarding/hooks/use-device-owner";
import { participantLogger } from "@utils/logger";

const AVATAR_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
];

export default function CreateTripScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { deviceOwnerName } = useDeviceOwner();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState<string | null>("USD");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [emoji, setEmoji] = useState<string | undefined>(undefined);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const {
    create: createTripMutation,
    loading: isCreating,
    error: createError,
  } = useCreateTrip();
  const { add: addParticipantMutation } = useAddParticipant();

  // Set dynamic header title
  useEffect(() => {
    navigation.setOptions({
      title: "Create Trip",
    });
  }, [navigation]);

  const handleStartDateChange = (date: Date) => {
    setStartDate(date);
    setDateError(null);
  };

  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
    setDateError(null);
  };

  const handleCreate = async () => {
    if (!name.trim() || !currency) {
      return;
    }

    if (endDate && endDate < startDate) {
      const message = "End date must be on or after the start date.";
      setDateError(message);
      Alert.alert("Invalid Dates", message);
      return;
    }

    try {
      const trip = await createTripMutation({
        name: name.trim(),
        currencyCode: currency,
        description: description.trim() || undefined,
        startDate: startDate.toISOString(),
        endDate: endDate?.toISOString() || undefined,
        emoji,
      });

      // Auto-add device owner as first participant if name is set
      if (deviceOwnerName) {
        try {
          await addParticipantMutation({
            tripId: trip.id,
            name: deviceOwnerName,
            avatarColor: AVATAR_COLORS[0], // First color for device owner
          });
        } catch (error) {
          participantLogger.warn(
            "Failed to add device owner as participant",
            error,
          );
          // Don't fail trip creation if participant add fails
        }
      }

      router.replace(`/trips/${trip.id}`);
    } catch (error) {
      // Use the caught error directly, not stale hook state
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create trip";
      Alert.alert("Error", errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      style={theme.commonStyles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: theme.spacing.lg + insets.top },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label="Trip name"
          placeholder="e.g., Summer Vacation"
          value={name}
          onChangeText={setName}
          autoFocus
          editable={!isCreating}
        />

        <View style={styles.row}>
          <View style={styles.halfColumn}>
            <Text style={styles.label}>Trip Emoji (optional)</Text>
            <TouchableOpacity
              style={styles.emojiButton}
              onPress={() => setEmojiPickerOpen(true)}
              disabled={isCreating}
            >
              <Text style={styles.emojiText}>{emoji || "➕"}</Text>
            </TouchableOpacity>
            {emoji && (
              <TouchableOpacity
                onPress={() => setEmoji(undefined)}
                style={styles.clearEmojiButton}
                disabled={isCreating}
              >
                <Text style={styles.clearEmojiText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.halfColumn}>
            <Text style={styles.label}>Trip Currency</Text>
            <CurrencyPicker
              value={currency}
              onChange={setCurrency}
              label={undefined}
              placeholder="Select currency"
            />
          </View>
        </View>

        <DateRangePicker
          startLabel="Start Date"
          endLabel="End Date"
          startDate={startDate}
          endDate={endDate}
          onStartChange={handleStartDateChange}
          onEndChange={handleEndDateChange}
        />
        {dateError && <Text style={styles.errorText}>{dateError}</Text>}

        <Input
          label="Description (optional)"
          placeholder="Add a short note or theme"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={styles.multiLine}
          editable={!isCreating}
        />
      </ScrollView>

      <View
        style={[
          theme.commonStyles.footer,
          { paddingBottom: theme.spacing.lg + insets.bottom },
        ]}
      >
        <Button
          title="Cancel"
          variant="outline"
          onPress={() => router.back()}
          fullWidth
          disabled={isCreating}
        />
        <View style={{ height: theme.spacing.md }} />
        <Button
          title={isCreating ? "Creating..." : "Create Trip"}
          onPress={handleCreate}
          fullWidth
          disabled={!name.trim() || !currency || isCreating}
        />
      </View>

      <EmojiPicker
        onEmojiSelected={(emojiObject) => {
          setEmoji(emojiObject.emoji);
          setEmojiPickerOpen(false);
        }}
        open={emojiPickerOpen}
        onClose={() => setEmojiPickerOpen(false)}
        enableSearchBar
        theme={{
          backdrop: "#0a0a0a88",
          knob: theme.colors.primary,
          container: theme.colors.surface,
          header: theme.colors.text,
          skinTonesContainer: theme.colors.surfaceElevated,
          category: {
            icon: theme.colors.primary,
            iconActive: theme.colors.text,
            container: theme.colors.surfaceElevated,
            containerActive: theme.colors.primary,
          },
          search: {
            text: theme.colors.text,
            placeholder: theme.colors.textMuted,
            icon: theme.colors.textSecondary,
            background: theme.colors.surfaceElevated,
          },
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 3, // Extra padding to prevent button cutoff
    gap: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.xxxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  label: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  errorText: {
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  multiLine: {
    textAlignVertical: "top",
    minHeight: 96,
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  halfColumn: {
    flex: 1,
  },
  emojiButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  emojiText: {
    fontSize: 32,
    color: theme.colors.text,
  },
  clearEmojiButton: {
    marginTop: theme.spacing.xs,
    alignSelf: "flex-end",
  },
  clearEmojiText: {
    fontSize: theme.typography.sm,
    color: theme.colors.error,
  },
});
