import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Card, Input, ParticipantChip } from '@ui/components';

export default function ManageParticipantsScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const [newParticipantName, setNewParticipantName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(['1', '2']));

  const mockParticipants = [
    { id: '1', name: 'Alex', avatarColor: '#FF6B6B' },
    { id: '2', name: 'Bailey', avatarColor: '#4ECDC4' },
    { id: '3', name: 'Cam', avatarColor: '#45B7D1' },
  ];

  const handleToggle = (participantId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }
      return next;
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Participants</Text>
        <Text style={styles.subtitle}>Trip: {tripId}</Text>

        <Card style={styles.placeholderCard}>
          <Text style={styles.eyebrow}>Coming soon</Text>
          <Text style={styles.placeholderText}>
            Real add/remove flows will connect to the repository. Chips below show the tap-to-toggle
            pattern we will use in expense splits.
          </Text>
        </Card>

        <Input
          label="Add a participant"
          placeholder="Enter a name"
          value={newParticipantName}
          onChangeText={setNewParticipantName}
          returnKeyType="done"
        />
        <Button title="Add (mock)" onPress={() => setNewParticipantName('')} fullWidth />

        <Card style={styles.participantCard}>
          <Text style={styles.sectionTitle}>Current mock participants</Text>
          <View style={styles.chips}>
            {mockParticipants.map((participant) => (
              <ParticipantChip
                key={participant.id}
                id={participant.id}
                name={participant.name}
                avatarColor={participant.avatarColor}
                selected={selected.has(participant.id)}
                onToggle={handleToggle}
              />
            ))}
          </View>
        </Card>
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
  subtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  placeholderCard: {
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  eyebrow: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  placeholderText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
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
});
