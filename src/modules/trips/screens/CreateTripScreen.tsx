import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@ui/theme';
import { Button, Card, Input } from '@ui/components';

export default function CreateTripScreen() {
  const router = useRouter();
  const [name, setName] = useState('Crew Trip');
  const [notes, setNotes] = useState('');

  const handleCreate = () => {
    // Placeholder navigation — real creation will be wired to the repository layer
    const targetId = name.trim() ? name.trim().toLowerCase().replace(/\s+/g, '-') : 'new-trip';
    router.replace(`/trips/${targetId}`);
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

        <Card style={styles.placeholderCard}>
          <Text style={styles.eyebrow}>Coming soon</Text>
          <Text style={styles.placeholderText}>
            This form will save to SQLite/Drizzle next. For now it just routes to a mock dashboard.
          </Text>
        </Card>

        <Input
          label="Trip name"
          placeholder="e.g., Summer Vacation"
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <Input
          label="Notes (optional)"
          placeholder="Add a short note or theme"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={styles.multiLine}
        />

        <Text style={styles.helperText}>
          Participants, expenses, and settlement stay empty until the data layer is plugged in.
        </Text>
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
          title="Create (mock)"
          onPress={handleCreate}
          fullWidth
          disabled={!name.trim()}
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
  multiLine: {
    textAlignVertical: 'top',
    minHeight: 96,
  },
  helperText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
