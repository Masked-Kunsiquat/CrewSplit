/**
 * UI/UX ENGINEER: ChangeDetailCard Component
 * Expandable card showing detailed field-by-field changes
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { theme } from "@ui/theme";
import type { FormattedChange } from "../types";

export interface ChangeDetailCardProps {
  /** Formatted change to display */
  change: FormattedChange;
}

/**
 * ChangeDetailCard - Expandable card showing change details
 *
 * Displays a change event with:
 * - Icon and title (always visible)
 * - Description (always visible if present)
 * - Field-level changes (expandable section)
 * - Timestamp
 *
 * @example
 * <ChangeDetailCard change={formattedChange} />
 */
export function ChangeDetailCard({ change }: ChangeDetailCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasFieldChanges = change.fieldChanges && change.fieldChanges.length > 0;
  const canExpand = hasFieldChanges;

  const handlePress = () => {
    if (canExpand) {
      setExpanded((prev) => !prev);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && canExpand && styles.pressed,
      ]}
      onPress={handlePress}
      accessibilityRole={canExpand ? "button" : "none"}
      accessibilityLabel={change.title}
      accessibilityHint={canExpand ? "Tap to view details" : undefined}
      accessibilityState={canExpand ? { expanded } : undefined}
    >
      <View style={styles.header}>
        {/* Timeline dot */}
        <View style={[styles.dot, { backgroundColor: change.color }]} />

        {/* Content */}
        <View style={styles.content}>
          {/* Icon and title row */}
          <View style={styles.titleRow}>
            <Text style={styles.icon} accessible={false}>
              {change.icon}
            </Text>
            <Text style={styles.title}>{change.title}</Text>
          </View>

          {/* Description */}
          {change.description && (
            <Text style={styles.description}>{change.description}</Text>
          )}

          {/* Timestamp */}
          <Text style={styles.timestamp}>
            {formatTimestamp(change.timestamp)}
          </Text>

          {/* Expandable field changes */}
          {expanded && hasFieldChanges && (
            <View style={styles.fieldChanges}>
              <Text style={styles.fieldChangesTitle}>Changes:</Text>
              {change.fieldChanges!.map((fieldChange, index) => (
                <View key={index} style={styles.fieldChange}>
                  <Text style={styles.fieldLabel}>{fieldChange.label}:</Text>
                  <View style={styles.fieldValues}>
                    <Text style={styles.oldValue}>{fieldChange.oldValue}</Text>
                    <Text style={styles.arrow}>→</Text>
                    <Text style={styles.newValue}>{fieldChange.newValue}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Expand indicator */}
          {canExpand && (
            <Text style={styles.expandIndicator}>
              {expanded ? "▼ Show less" : "▶ Show details"}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Format ISO timestamp into relative time or absolute date
 */
function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Less than 1 minute ago
    if (diffMins < 1) {
      return "Just now";
    }

    // Less than 1 hour ago
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    }

    // Less than 24 hours ago
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    }

    // Less than 7 days ago
    if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    }

    // Absolute date for older changes
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: theme.spacing.md,
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  icon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
  },
  description: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  timestamp: {
    fontSize: theme.typography.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  fieldChanges: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  fieldChangesTitle: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  fieldChange: {
    marginBottom: theme.spacing.sm,
  },
  fieldLabel: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  fieldValues: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  oldValue: {
    fontSize: theme.typography.sm,
    color: theme.colors.error,
    textDecorationLine: "line-through",
  },
  arrow: {
    fontSize: theme.typography.sm,
    color: theme.colors.textMuted,
    marginHorizontal: theme.spacing.sm,
  },
  newValue: {
    fontSize: theme.typography.sm,
    color: theme.colors.success,
    fontWeight: theme.typography.medium,
  },
  expandIndicator: {
    fontSize: theme.typography.xs,
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
    fontWeight: theme.typography.medium,
  },
});
