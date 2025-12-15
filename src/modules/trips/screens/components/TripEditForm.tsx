/**
 * UI/UX ENGINEER: TripEditForm component
 * Form for editing trip name, emoji, and end date
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import EmojiPicker from 'rn-emoji-keyboard';
import { theme } from '@ui/theme';
import { Button, Card, Input, DatePicker } from '@ui/components';
import type { Trip } from '../../types';

interface TripEditFormProps {
  trip: Trip;
  nameInput: string;
  setNameInput: (value: string) => void;
  emojiInput: string | undefined;
  setEmojiInput: (value: string | undefined) => void;
  emojiPickerOpen: boolean;
  setEmojiPickerOpen: (value: boolean) => void;
  endDateInput: Date | null;
  setEndDateInput: (value: Date | null) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function TripEditForm({
  trip,
  nameInput,
  setNameInput,
  emojiInput,
  setEmojiInput,
  emojiPickerOpen,
  setEmojiPickerOpen,
  endDateInput,
  setEndDateInput,
  onSave,
  onCancel,
}: TripEditFormProps) {
  return (
    <>
      <Card style={styles.editCard}>
        <Input
          label="Trip name"
          value={nameInput}
          onChangeText={setNameInput}
          autoFocus
        />

        <View style={styles.emojiRow}>
          <Text style={styles.editLabel}>Trip Emoji (optional)</Text>
          <View style={styles.emojiControls}>
            <TouchableOpacity
              style={styles.emojiEditButtonCompact}
              onPress={() => setEmojiPickerOpen(true)}
            >
              <Text style={styles.emojiEditText}>{emojiInput || '➕'}</Text>
            </TouchableOpacity>
            {emojiInput && (
              <TouchableOpacity
                onPress={() => setEmojiInput(undefined)}
                style={styles.clearEmojiButtonInline}
              >
                <Text style={styles.clearEmojiText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.dateSection}>
          <Text style={styles.dateLabel}>Start Date (cannot be changed)</Text>
          <Text style={styles.dateValue}>
            {new Date(trip.startDate).toLocaleDateString()}
          </Text>
        </View>

        {endDateInput ? (
          <DatePicker
            label="End Date (optional)"
            value={endDateInput}
            onChange={setEndDateInput}
            minimumDate={new Date(trip.startDate)}
          />
        ) : (
          <View>
            <Text style={styles.dateLabel}>End Date (optional)</Text>
            <TouchableOpacity
              style={styles.addEndDateButton}
              onPress={() => setEndDateInput(new Date(trip.startDate))}
            >
              <Text style={styles.addEndDateText}>+ Add end date</Text>
            </TouchableOpacity>
          </View>
        )}

        {endDateInput && (
          <TouchableOpacity
            onPress={() => setEndDateInput(null)}
            style={styles.clearEndDateButton}
          >
            <Text style={styles.clearEndDateText}>Clear end date</Text>
          </TouchableOpacity>
        )}

        <View style={styles.buttonRow}>
          <View style={styles.buttonHalf}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onCancel}
              fullWidth
            />
          </View>
          <View style={styles.buttonHalf}>
            <Button
              title="Save"
              onPress={onSave}
              fullWidth
            />
          </View>
        </View>
      </Card>

      <EmojiPicker
        onEmojiSelected={(emojiObject) => {
          setEmojiInput(emojiObject.emoji);
          setEmojiPickerOpen(false);
        }}
        open={emojiPickerOpen}
        onClose={() => setEmojiPickerOpen(false)}
        enableSearchBar
        theme={{
          backdrop: '#0a0a0a88',
          knob: theme.colors.primary,
          container: theme.colors.surface,
          header: theme.colors.text,
          skinTonesContainer: theme.colors.surfaceElevated,
          category: {
            icon: theme.colors.primary,
            iconActive: theme.colors.text,
            container: theme.colors.surfaceElevated,
            containerActive: theme.colors.primary,
          },
          search: {
            text: theme.colors.text,
            placeholder: theme.colors.textMuted,
            icon: theme.colors.textSecondary,
            background: theme.colors.surfaceElevated,
          },
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  editCard: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  editLabel: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emojiControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emojiEditButtonCompact: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiEditText: {
    fontSize: 32,
    color: theme.colors.text,
  },
  clearEmojiButtonInline: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  clearEmojiText: {
    fontSize: theme.typography.sm,
    color: theme.colors.error,
  },
  dateSection: {
    gap: theme.spacing.xs,
  },
  dateLabel: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textSecondary,
  },
  dateValue: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    padding: theme.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  addEndDateButton: {
    padding: theme.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  addEndDateText: {
    fontSize: theme.typography.base,
    color: theme.colors.primary,
    fontWeight: theme.typography.medium,
  },
  clearEndDateButton: {
    alignSelf: 'flex-start',
  },
  clearEndDateText: {
    fontSize: theme.typography.sm,
    color: theme.colors.error,
    fontWeight: theme.typography.medium,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  buttonHalf: {
    flex: 1,
  },
});
