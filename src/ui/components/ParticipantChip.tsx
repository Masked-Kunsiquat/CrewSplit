/**
 * UI COMPONENT - ParticipantChip
 * UI/UX ENGINEER: Tap-to-toggle participant selector chip
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, GestureResponderEvent } from 'react-native';
import { theme } from '../theme';

interface ParticipantChipProps {
  id: string;
  name: string;
  avatarColor?: string;
  selected?: boolean;
  onToggle?: (id: string) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
}

export const ParticipantChip: React.FC<ParticipantChipProps> = ({
  id,
  name,
  avatarColor,
  selected = false,
  onToggle,
  onLongPress,
  disabled = false,
}) => {
  const handlePress = () => {
    if (!disabled && onToggle) {
      onToggle(id);
    }
  };

  const chipStyle = [
    styles.chip,
    selected && styles.chipSelected,
    disabled && styles.chipDisabled,
  ];

  const textStyle = [
    styles.text,
    selected && styles.textSelected,
    disabled && styles.textDisabled,
  ];

  // Use avatarColor or fallback to primary
  const avatarBgColor = avatarColor || theme.colors.primary;

  return (
    <TouchableOpacity
      style={chipStyle}
      onPress={handlePress}
      onLongPress={onLongPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: avatarBgColor }]}>
        <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={textStyle}>{name}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    minHeight: theme.touchTarget.minHeight,
  },
  chipSelected: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.primary,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarText: {
    color: theme.colors.text,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.bold,
  },
  text: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    fontWeight: theme.typography.medium,
  },
  textSelected: {
    color: theme.colors.primary,
  },
  textDisabled: {
    color: theme.colors.textMuted,
  },
});
