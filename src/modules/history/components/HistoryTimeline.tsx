/**
 * UI/UX ENGINEER: HistoryTimeline Component
 * Chronological list of changes to a trip
 */

import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { theme } from "@ui/theme";
import { ChangeDetailCard } from "./ChangeDetailCard";
import type { FormattedChange } from "../types";

export interface HistoryTimelineProps {
  /** Array of formatted changes to display */
  changes: FormattedChange[];
  /** Optional empty state message */
  emptyMessage?: string;
}

/**
 * HistoryTimeline - Chronological list of trip changes
 *
 * Displays a vertical timeline of all changes made to a trip,
 * with newest changes at the top. Uses FlatList for performance
 * with large change histories.
 *
 * @example
 * <HistoryTimeline changes={formattedChanges} />
 */
export function HistoryTimeline({
  changes,
  emptyMessage = "No history yet",
}: HistoryTimelineProps) {
  if (changes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📜</Text>
        <Text style={styles.emptyMessage}>{emptyMessage}</Text>
        <Text style={styles.emptyHint}>
          Changes you make to this trip will appear here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={changes}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ChangeDetailCard change={item} />}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={true}
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={15}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: theme.spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  emptyMessage: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  emptyHint: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
});
