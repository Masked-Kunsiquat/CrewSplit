/**
 * EXPENSES MODULE - Add Expense Screen
 * UI/UX ENGINEER: Form to add a new expense
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Input, ParticipantChip } from '@ui/components';

export default function AddExpenseScreen() {
  const router = useRouter();
  const { id: tripId } = useLocalSearchParams<{ id: string }>();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Mock participants - will be fetched from repository
  const mockParticipants = [
    { id: '1', name: 'Alice', avatarColor: '#FF6B6B' },
    { id: '2', name: 'Bob', avatarColor: '#4ECDC4' },
    { id: '3', name: 'Charlie', avatarColor: '#45B7D1' },
  ];

  const handleToggleParticipant = (participantId: string) => {
    setSelectedParticipants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  };

  const handleCreate = async () => {
    setLoading(true);
    // TODO: Call repository to create expense
    setTimeout(() => {
      setLoading(false);
      router.back();
    }, 1000);
  };

  const canSubmit = description.trim() && amount && selectedParticipants.size > 0;

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

        <Input
          label="Description"
          placeholder="e.g., Dinner at Restaurant"
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
          <Text style={styles.sectionLabel}>Split Between</Text>
          <Text style={styles.sectionHelper}>Tap to select participants</Text>
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

        <Text style={styles.helperText}>
          Expense will be split equally among selected participants
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Cancel"
          variant="outline"
          onPress={() => router.back()}
          fullWidth
          disabled={loading}
        />
        <View style={{ height: theme.spacing.md }} />
        <Button
          title="Add Expense"
          onPress={handleCreate}
          fullWidth
          disabled={!canSubmit}
          loading={loading}
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
  },
  title: {
    fontSize: theme.typography.xxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  sectionHelper: {
    fontSize: theme.typography.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  participantChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  helperText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
