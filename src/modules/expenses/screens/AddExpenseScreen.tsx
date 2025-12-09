import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Card, Input, ParticipantChip } from '@ui/components';

export default function AddExpenseScreen() {
  const router = useRouter();
  const { id: tripId } = useLocalSearchParams<{ id: string }>();

  const [description, setDescription] = useState('Mock expense');
  const [amount, setAmount] = useState('42.00');
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set(['1']));

  const mockParticipants = [
    { id: '1', name: 'Alex', avatarColor: '#FF6B6B' },
    { id: '2', name: 'Bailey', avatarColor: '#4ECDC4' },
    { id: '3', name: 'Cam', avatarColor: '#45B7D1' },
  ];

  const handleToggleParticipant = (participantId: string) => {
    setSelectedParticipants(prev => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }
      return next;
    });
  };

  const handleCreate = () => {
    // Placeholder navigation until repositories are wired
    router.replace(`/trips/${tripId}/expenses`);
  };

  const normalizedAmountInput = amount.replace(',', '.').trim();
  const parsedAmount = Number(normalizedAmountInput);
  const canSubmit =
    description.trim().length > 0 &&
    !Number.isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    selectedParticipants.size > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Add Expense</Text>

        <Card style={styles.placeholderCard}>
          <Text style={styles.eyebrow}>Coming soon</Text>
          <Text style={styles.placeholderText}>
            This form will post to SQLite/Drizzle. For now it demonstrates the tap-to-toggle flow.
          </Text>
        </Card>

        <Input
          label="What was this?"
          placeholder="e.g., Dinner at Marina"
          value={description}
          onChangeText={setDescription}
          autoFocus
        />

        <Input
          label="Amount"
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Split between</Text>
          <Text style={styles.sectionHelper}>Tap chips to toggle participants (mock data)</Text>
          <View style={styles.participantChips}>
            {mockParticipants.map(participant => (
              <ParticipantChip
                key={participant.id}
                id={participant.id}
                name={participant.name}
                avatarColor={participant.avatarColor}
                selected={selectedParticipants.has(participant.id)}
                onToggle={handleToggleParticipant}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Cancel"
          variant="outline"
          onPress={() => router.back()}
          fullWidth
        />
        <View style={{ height: theme.spacing.md }} />
        <Button
          title="Save (mock)"
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
  title: {
    fontSize: theme.typography.xxxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
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
  section: {
    gap: theme.spacing.xs,
  },
  sectionLabel: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    color: theme.colors.textSecondary,
  },
  sectionHelper: {
    fontSize: theme.typography.xs,
    color: theme.colors.textMuted,
  },
  participantChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
