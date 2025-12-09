/**
 * TRIPS MODULE - Create Trip Screen
 * UI/UX ENGINEER: Form to create a new trip
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Input } from '@ui/components';

export default function CreateTripScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    // TODO: Call repository to create trip
    setTimeout(() => {
      setLoading(false);
      router.back();
    }, 1000);
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
        <Text style={styles.title}>Create New Trip</Text>

        <Input
          label="Trip Name"
          placeholder="e.g., Summer Vacation"
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <Input
          label="Description (Optional)"
          placeholder="Add a description..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          style={{ textAlignVertical: 'top', minHeight: 100 }}
        />

        <Text style={styles.helperText}>
          You can add participants and expenses after creating the trip.
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
          title="Create Trip"
          onPress={handleCreate}
          fullWidth
          disabled={!name.trim()}
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
