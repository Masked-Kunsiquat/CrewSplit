/**
 * UI COMPONENT - ParticipantListRow
 * UI/UX ENGINEER: Simple list row for displaying participants with delete action
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '@ui/theme';

/**
 * Calculate relative luminance of an RGB color (WCAG 2.0)
 * @param r Red component (0-255)
 * @param g Green component (0-255)
 * @param b Blue component (0-255)
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const val = c / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate WCAG contrast ratio between two colors
 */
function getContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get accessible text color for a given background color
 * Returns white or black based on WCAG AA contrast requirements (4.5:1)
 * Falls back to white if the input is not a valid hex color
 */
function getAccessibleTextColor(backgroundColor: string): string {
  // Validate hex color format (#RRGGBB or RRGGBB)
  const hexPattern = /^#?([0-9A-Fa-f]{6})$/;
  const match = backgroundColor.match(hexPattern);

  if (!match) {
    // Invalid format - fall back to white for safety
    return '#FFFFFF';
  }

  // Parse hex color
  const hex = match[1];
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Additional validation: ensure parsed values are valid numbers
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return '#FFFFFF';
  }

  const bgLuminance = getLuminance(r, g, b);
  const whiteLuminance = 1; // White has luminance of 1
  const blackLuminance = 0; // Black has luminance of 0

  const whiteContrast = getContrastRatio(whiteLuminance, bgLuminance);
  const blackContrast = getContrastRatio(blackLuminance, bgLuminance);

  // Choose the color with better contrast
  return whiteContrast > blackContrast ? '#FFFFFF' : '#000000';
}

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
  const textColor = getAccessibleTextColor(avatarBgColor);

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
        <Text style={[styles.avatarText, { color: textColor }]}>
          {name.charAt(0).toUpperCase()}
        </Text>
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
    // Color is dynamically set based on background for WCAG AA contrast
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
