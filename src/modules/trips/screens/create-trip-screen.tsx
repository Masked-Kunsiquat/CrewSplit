import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Input, CurrencyPicker } from '@ui/components';
import { createTrip } from '../repository';

export default function CreateTripScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<string | null>('USD');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !currency) {
      return;
    }

    setIsCreating(true);
    try {
      const trip = await createTrip({
        name: name.trim(),
        currencyCode: currency,
        description: description.trim() || undefined,
        startDate: new Date().toISOString(),
      });

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
        <Text style={styles.title}>Create Trip</Text>

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
            placeholder="Select currency"
          />
        </View>

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
