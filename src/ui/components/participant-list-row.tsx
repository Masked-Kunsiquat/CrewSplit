/**
 * UI COMPONENT - ParticipantListRow
 * UI/UX ENGINEER: Simple list row for displaying participants with delete action
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '@ui/theme';

interface ParticipantListRowProps {
  /** Participant ID */
  id: string;
  /** Participant name */
  name: string;
  /** Avatar color */
  avatarColor?: string;
  /** Callback when long-pressed for delete */
  onLongPress: (id: string, name: string) => void;
}

/**
 * Simple row component for displaying participants in a list.
 * Shows avatar and name, supports long-press for delete.
 *
 * @example
 * <ParticipantListRow
 *   id="p1"
 *   name="Alice"
 *   avatarColor="#FF6B6B"
 *   onLongPress={handleDelete}
 * />
 */
export function ParticipantListRow({
  id,
  name,
  avatarColor,
  onLongPress,
}: ParticipantListRowProps) {
  const avatarBgColor = avatarColor || theme.colors.primary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
      ]}
      onLongPress={() => onLongPress(id, name)}
      accessibilityRole="button"
      accessibilityLabel={`${name}, long press to remove`}
      accessibilityHint="Long press to remove this participant"
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: avatarBgColor }]}>
        <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
      </View>

      {/* Name */}
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.touchTarget.minHeight,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowPressed: {
    backgroundColor: theme.colors.surface,
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
  name: {
    flex: 1,
    fontSize: theme.typography.base,
    color: theme.colors.text,
    fontWeight: theme.typography.medium,
  },
});
