/**
 * UI/UX ENGINEER: ManageParticipants screen
 * Manages participant list with add/remove actions and pull-to-refresh
 */

import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { theme } from "@ui/theme";
import { participantLogger } from "@utils/logger";
import {
  Button,
  Card,
  Input,
  ParticipantListRow,
  ConfirmDialog,
  LoadingScreen,
} from "@ui/components";
import { useParticipants } from "../hooks/use-participants";
import {
  useAddParticipant,
  useRemoveParticipant,
} from "../hooks/use-participant-mutations";
import { useTripById } from "@modules/trips/hooks/use-trips";
import { useRefreshControl } from "@hooks/use-refresh-control";

// Predefined avatar colors for new participants
const AVATAR_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
];

export default function ManageParticipantsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const tripIdParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const tripId = tripIdParam?.trim() || null;

  if (!tripId) {
    return (
      <View style={theme.commonStyles.container}>
        <View style={styles.errorContainer}>
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>
              Missing trip id. Please navigate back and select a trip.
            </Text>
            <Button
              title="Back to trips"
              onPress={() => router.replace("/")}
              fullWidth
            />
          </Card>
        </View>
      </View>
    );
  }

  return <ManageParticipantsContent tripId={tripId} navigation={navigation} />;
}

function ManageParticipantsContent({
  tripId,
  navigation,
}: {
  tripId: string;
  navigation: any;
}) {
  const router = useRouter();
  const [newParticipantName, setNewParticipantName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { trip, refetch: refetchTrip } = useTripById(tripId);
  const {
    participants,
    loading,
    error,
    refetch: refetchParticipants,
  } = useParticipants(tripId);

  const {
    add: addParticipantMutation,
    loading: isAdding,
    error: addError,
  } = useAddParticipant();
  const { remove: removeParticipantMutation } = useRemoveParticipant();

  // Pull-to-refresh support
  const refreshControl = useRefreshControl([refetchTrip, refetchParticipants]);

  // Update native header title
  useEffect(() => {
    if (trip) {
      navigation.setOptions({
        title: `${trip.name} - Participants`,
      });
    }
  }, [trip, navigation]);

  const handleAddParticipant = async () => {
    if (isAdding) return;
    if (!newParticipantName.trim()) {
      setNameError("Name is required");
      return;
    }

    // Pick a random color
    const avatarColor =
      AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const newParticipant = await addParticipantMutation({
      tripId,
      name: newParticipantName.trim(),
      avatarColor,
    });

    if (newParticipant) {
      refetchParticipants();
      setNewParticipantName("");
      setNameError(null);
    } else {
      // addError contains the original error with context
      const errorMessage = addError?.message || "Failed to add participant";
      Alert.alert("Error", errorMessage);
    }
  };

  const handleDeleteParticipant = async (
    participantId: string,
    participantName: string,
  ) => {
    setPendingRemoval({ id: participantId, name: participantName });
  };

  const handleViewParticipant = (participantId: string) => {
    router.push(`/trips/${tripId}/participants/${participantId}`);
  };

  const confirmRemoveParticipant = async () => {
    if (!pendingRemoval) return;
    try {
      await removeParticipantMutation(pendingRemoval.id);
      refetchParticipants();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      participantLogger.error("Failed to delete participant", err);
      Alert.alert("Error", `Failed to remove participant: ${message}`);
    } finally {
      setPendingRemoval(null);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <View style={theme.commonStyles.container}>
        <View style={styles.errorContainer}>
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>
              {typeof error === "string"
                ? error
                : (error?.message ?? String(error))}
            </Text>
          </Card>
        </View>
      </View>
    );
  }

  return (
    <View style={theme.commonStyles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
      >
        <Input
          label="Add a participant"
          placeholder="Enter a name"
          value={newParticipantName}
          error={nameError ?? undefined}
          onChangeText={(t) => {
            setNewParticipantName(t);
            if (nameError) setNameError(null);
          }}
          returnKeyType="done"
          onSubmitEditing={handleAddParticipant}
          editable={!isAdding}
        />
        <Button
          title={isAdding ? "Adding..." : "Add Participant"}
          onPress={handleAddParticipant}
          fullWidth
          disabled={isAdding || !newParticipantName.trim()}
        />

        {participants.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No participants yet</Text>
            <Text style={styles.emptyText}>
              Add participants to track who shares expenses on this trip.
            </Text>
          </Card>
        ) : (
          <Card style={styles.participantCard}>
            <Text style={styles.sectionTitle}>
              Participants ({participants.length})
            </Text>
            <View style={styles.participantList}>
              {[...participants]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((participant) => (
                  <ParticipantListRow
                    key={participant.id}
                    id={participant.id}
                    name={participant.name}
                    avatarColor={participant.avatarColor}
                    onPress={handleViewParticipant}
                    onLongPress={handleDeleteParticipant}
                  />
                ))}
            </View>
            <Text style={styles.hintText}>
              Tap to view details • Long-press to remove
            </Text>
          </Card>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={!!pendingRemoval}
        title="Remove Participant"
        message={
          pendingRemoval ? `Remove ${pendingRemoval.name} from this trip?` : ""
        }
        confirmLabel="Remove"
        confirmVariant="danger"
        onCancel={() => setPendingRemoval(null)}
        onConfirm={confirmRemoveParticipant}
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
  participantCard: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  participantList: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    overflow: "hidden",
    marginTop: theme.spacing.xs,
  },
  hintText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
});
