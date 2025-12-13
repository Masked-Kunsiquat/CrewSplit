import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Input, CurrencyPicker, DateRangePicker } from '@ui/components';
import { createTrip } from '../repository';
import { createParticipant } from '../../participants/repository';
import { useDeviceOwner } from '@hooks/use-device-owner';

const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE', '#85C1E2'];

export default function CreateTripScreen() {
  const router = useRouter();
  const { deviceOwnerName } = useDeviceOwner();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<string | null>('USD');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

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
      const message = 'End date must be on or after the start date.';
      setDateError(message);
      Alert.alert('Invalid Dates', message);
      return;
    }

    setIsCreating(true);
    try {
      const trip = await createTrip({
        name: name.trim(),
        currencyCode: currency,
        description: description.trim() || undefined,
        startDate: startDate.toISOString(),
        endDate: endDate?.toISOString() || undefined,
      });

      // Auto-add device owner as first participant if name is set
      if (deviceOwnerName) {
        try {
          await createParticipant({
            tripId: trip.id,
            name: deviceOwnerName,
            avatarColor: AVATAR_COLORS[0], // First color for device owner
          });
        } catch (error) {
          participantLogger.warn('Failed to add device owner as participant', error);
          // Don't fail trip creation if participant add fails
        }
      }

      router.replace(`/trips/${trip.id}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to create trip');
      setIsCreating(false);
    }
  };

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
        <Input
          label="Trip name"
          placeholder="e.g., Summer Vacation"
          value={name}
          onChangeText={setName}
          autoFocus
          editable={!isCreating}
        />

        <View>
          <Text style={styles.label}>Trip Currency</Text>
          <CurrencyPicker
            value={currency}
            onChange={setCurrency}
            label={undefined}
            placeholder="Select currency"
          />
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
          title={isCreating ? 'Creating...' : 'Create Trip'}
          onPress={handleCreate}
          fullWidth
          disabled={!name.trim() || !currency || isCreating}
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
    textAlignVertical: 'top',
    minHeight: 96,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
