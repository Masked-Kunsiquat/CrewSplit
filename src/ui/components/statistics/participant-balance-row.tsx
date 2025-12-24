/**
 * UI COMPONENT - ParticipantBalanceRow
 * UI/UX ENGINEER: List row for displaying participant balances with status indicators
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { theme } from "@ui/theme";
import { CurrencyUtils } from "@utils/currency";

/**
 * Calculate relative luminance of an RGB color (WCAG 2.0)
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
 */
function getAccessibleTextColor(backgroundColor: string): string {
  const hexPattern = /^#?([0-9A-Fa-f]{6})$/;
  const match = backgroundColor.match(hexPattern);

  if (!match) {
    return "#FFFFFF";
  }

  const hex = match[1];
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return "#FFFFFF";
  }

  const bgLuminance = getLuminance(r, g, b);
  const whiteLuminance = 1;
  const blackLuminance = 0;

  const whiteContrast = getContrastRatio(whiteLuminance, bgLuminance);
  const blackContrast = getContrastRatio(blackLuminance, bgLuminance);

  return whiteContrast > blackContrast ? "#FFFFFF" : "#000000";
}

export interface ParticipantBalanceRowProps {
  /** Participant data */
  participant: {
    id: string;
    name: string;
    avatarColor?: string;
  };
  /** Balance in minor units (cents) - positive means owed, negative means owes */
  balance: number;
  /** Currency code (ISO 4217) */
  currency: string;
  /** Show status indicator (Owes/Owed/Settled) */
  showStatus?: boolean;
  /** Callback when row is pressed */
  onPress?: (participantId: string) => void;
}

/**
 * ParticipantBalanceRow component
 * Displays participant with avatar, name, balance, and optional status indicator
 */
export const ParticipantBalanceRow: React.FC<ParticipantBalanceRowProps> = ({
  participant,
  balance,
  currency,
  showStatus = true,
  onPress,
}) => {
  const { id, name, avatarColor } = participant;
  const avatarBgColor = avatarColor || theme.colors.primary;
  const textColor = getAccessibleTextColor(avatarBgColor);

  // Format balance
  const formattedBalance = CurrencyUtils.formatMinor(balance, currency);

  // Determine balance color and status
  const isPositive = balance > 0;
  const isNegative = balance < 0;

  const balanceColor = isPositive
    ? theme.colors.success
    : isNegative
      ? theme.colors.error
      : theme.colors.textSecondary;

  const statusText = isPositive ? "Owed" : isNegative ? "Owes" : "Settled";
  const statusIcon = isPositive ? "↓" : isNegative ? "↑" : "—";

  // Accessibility label
  const accessibilityLabel = `${name} balance is ${formattedBalance}. ${statusText}`;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress ? () => onPress(id) : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={!onPress}
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

      {/* Balance and Status */}
      <View style={styles.balanceContainer}>
        {showStatus && (
          <View style={styles.statusContainer}>
            <Text style={[styles.statusIcon, { color: balanceColor }]}>
              {statusIcon}
            </Text>
            <Text style={[styles.statusText, { color: balanceColor }]}>
              {statusText}
            </Text>
          </View>
        )}
        <Text style={[styles.balance, { color: balanceColor }]}>
          {formattedBalance}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  avatarText: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.bold,
  },
  name: {
    flex: 1,
    fontSize: theme.typography.base,
    color: theme.colors.text,
    fontWeight: theme.typography.medium,
  },
  balanceContainer: {
    alignItems: "flex-end",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: 2,
  },
  statusIcon: {
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.bold,
  },
  statusText: {
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.medium,
  },
  balance: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.bold,
  },
});
