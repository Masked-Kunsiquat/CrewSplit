import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Input, ParticipantChip, DatePicker } from '@ui/components';
import { useTripById } from '../../trips/hooks/use-trips';
import { useParticipants } from '../../participants/hooks/use-participants';
import { addExpense } from '../repository';
import { parseCurrency } from '@utils/currency';

export default function AddExpenseScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id: tripId } = useLocalSearchParams<{ id: string }>();

  const { trip, loading: tripLoading } = useTripById(tripId);
  const { participants, loading: participantsLoading } = useParticipants(tripId);

  // Update native header title
  useEffect(() => {
    if (trip) {
      navigation.setOptions({
        title: `Add Expense - ${trip.name}`,
      });
    }
  }, [trip, navigation]);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  // Auto-select first participant as payer if not set
  React.useEffect(() => {
    if (participants.length > 0 && !paidBy) {
      setPaidBy(participants[0].id);
    }
  }, [participants, paidBy]);

  // Auto-select all participants for split if none selected
  React.useEffect(() => {
    if (participants.length > 0 && selectedParticipants.size === 0) {
      setSelectedParticipants(new Set(participants.map(p => p.id)));
    }
  }, [participants]);

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

  const handleCreate = async () => {
    if (!trip || !paidBy || selectedParticipants.size === 0) {
      return;
    }

    const amountMinor = parseCurrency(amount);
    if (amountMinor <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than zero.');
      return;
    }

    setIsCreating(true);
    try {
      await addExpense({
        tripId,
        description: description.trim(),
        originalAmountMinor: amountMinor,
        originalCurrency: trip.currency,
        paidBy,
        date: date.toISOString(),
        splits: Array.from(selectedParticipants).map(participantId => ({
          participantId,
          share: 1,
          shareType: 'equal' as const,
        })),
      });

      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to add expense');
      setIsCreating(false);
    }
  };

  const loading = tripLoading || participantsLoading;

  const canSubmit =
    !isCreating &&
    description.trim().length > 0 &&
    amount.trim().length > 0 &&
    paidBy !== null &&
    selectedParticipants.size > 0;

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
          <Text style={styles.errorText}>
            {!trip ? 'Trip not found' : 'Add participants first'}
          </Text>
        </View>
      </View>
    );
  }

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
          label="What was this?"
          placeholder="e.g., Dinner at Marina"
          value={description}
          onChangeText={setDescription}
          autoFocus
          editable={!isCreating}
        />

        <Input
          label={`Amount (${trip.currency})`}
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          editable={!isCreating}
        />

        <DatePicker
          label="Date"
          value={date}
          onChange={setDate}
          maximumDate={new Date()}
        />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Paid by</Text>
          <View style={styles.participantChips}>
            {participants.map(participant => (
              <ParticipantChip
                key={participant.id}
                id={participant.id}
                name={participant.name}
                avatarColor={participant.avatarColor}
                selected={paidBy === participant.id}
                onToggle={() => setPaidBy(participant.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Split between</Text>
          <Text style={styles.sectionHelper}>Tap to toggle participants in this expense</Text>
          <View style={styles.participantChips}>
            {participants.map(participant => (
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
          disabled={isCreating}
        />
        <View style={{ height: theme.spacing.md }} />
        <Button
          title={isCreating ? 'Saving...' : 'Save Expense'}
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
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: theme.typography.lg,
    color: theme.colors.error,
    textAlign: 'center',
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
