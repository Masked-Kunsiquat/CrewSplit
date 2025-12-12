import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Card, Input, ParticipantChip } from '@ui/components';
import { useParticipants } from '../hooks/use-participants';
import { useTripById } from '@modules/trips/hooks/use-trips';
import { createParticipant, deleteParticipant } from '../repository';

// Predefined avatar colors for new participants
const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE', '#85C1E2'];

export default function ManageParticipantsScreen() {
  const navigation = useNavigation();
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const [newParticipantName, setNewParticipantName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const { trip } = useTripById(tripId);
  const { participants, loading, error } = useParticipants(tripId);

  // Update native header title
  useEffect(() => {
    if (trip) {
      navigation.setOptions({
        title: `${trip.name} - Participants`,
      });
    }
  }, [trip, navigation]);

  const handleAddParticipant = async () => {
    if (!newParticipantName.trim()) {
      return;
    }

    setIsAdding(true);
    try {
      // Pick a random color
      const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

      await createParticipant({
        tripId,
        name: newParticipantName.trim(),
        avatarColor,
      });

      setNewParticipantName('');
      // Participants will auto-refresh via useParticipants hook
    } catch (err) {
      Alert.alert('Error', 'Failed to add participant');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteParticipant = async (participantId: string, participantName: string) => {
    Alert.alert(
      'Remove Participant',
      `Remove ${participantName} from this trip?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteParticipant(participantId);
            } catch (err) {
              Alert.alert('Error', 'Failed to remove participant');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Participants</Text>

        <Input
          label="Add a participant"
          placeholder="Enter a name"
          value={newParticipantName}
          onChangeText={setNewParticipantName}
          returnKeyType="done"
          onSubmitEditing={handleAddParticipant}
          editable={!isAdding}
        />
        <Button
          title={isAdding ? 'Adding...' : 'Add Participant'}
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
            <Text style={styles.sectionTitle}>Participants ({participants.length})</Text>
            <View style={styles.chips}>
              {participants.map((participant) => (
                <ParticipantChip
                  key={participant.id}
                  id={participant.id}
                  name={participant.name}
                  avatarColor={participant.avatarColor}
                  selected={false}
                  onToggle={() => {}}
                  onLongPress={() => handleDeleteParticipant(participant.id, participant.name)}
                />
              ))}
            </View>
            <Text style={styles.hintText}>Long-press to remove a participant</Text>
          </Card>
        )}
      </ScrollView>
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
  title: {
    fontSize: theme.typography.xxxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderWidth: 1,
    alignItems: 'center',
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
    textAlign: 'center',
  },
  participantCard: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  hintText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
});
