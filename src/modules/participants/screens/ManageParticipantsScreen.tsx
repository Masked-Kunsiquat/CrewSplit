/**
 * PARTICIPANTS MODULE - Manage Participants Screen
 * UI/UX ENGINEER: Add, edit, and remove participants
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Input, Card } from '@ui/components';

export default function ManageParticipantsScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();

  const [newParticipantName, setNewParticipantName] = useState('');

  // Mock data - will be replaced with real data from repository
  const mockParticipants = [
    { id: '1', name: 'Alice', avatarColor: '#FF6B6B' },
    { id: '2', name: 'Bob', avatarColor: '#4ECDC4' },
    { id: '3', name: 'Charlie', avatarColor: '#45B7D1' },
  ];

  const handleAddParticipant = () => {
    if (newParticipantName.trim()) {
      // TODO: Call repository to add participant
      setNewParticipantName('');
    }
  };

  const handleRemoveParticipant = (participantId: string) => {
    // TODO: Call repository to remove participant
    console.log('Remove participant:', participantId);
  };

  const getRandomColor = () => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Manage Participants</Text>

        <View style={styles.addSection}>
          <Input
            label="Add New Participant"
            placeholder="Enter name..."
            value={newParticipantName}
            onChangeText={setNewParticipantName}
            onSubmitEditing={handleAddParticipant}
            returnKeyType="done"
          />
          <Button
            title="Add"
            onPress={handleAddParticipant}
            disabled={!newParticipantName.trim()}
            fullWidth
          />
        </View>

        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Current Participants</Text>
          {mockParticipants.map((participant) => (
            <Card key={participant.id} style={styles.participantCard}>
              <View style={styles.participantRow}>
                <View style={styles.participantInfo}>
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: participant.avatarColor },
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {participant.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.participantName}>{participant.name}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveParticipant(participant.id)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </View>

        <Text style={styles.helper}>
          Note: You cannot remove participants who have expenses associated with them.
        </Text>
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
  },
  title: {
    fontSize: theme.typography.xxxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  addSection: {
    marginBottom: theme.spacing.xl,
  },
  listSection: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  participantCard: {
    marginBottom: theme.spacing.md,
  },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    color: theme.colors.text,
    fontSize: theme.typography.base,
    fontWeight: theme.typography.bold,
  },
  participantName: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.medium,
    color: theme.colors.text,
  },
  removeButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  removeButtonText: {
    fontSize: theme.typography.sm,
    color: theme.colors.error,
    fontWeight: theme.typography.medium,
  },
  helper: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
