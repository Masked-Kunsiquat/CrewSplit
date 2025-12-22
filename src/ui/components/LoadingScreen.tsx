/**
 * UI COMPONENT: LoadingScreen
 * Reusable loading state component with spinner and optional message
 */

import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { theme } from "@ui/theme";

export interface LoadingScreenProps {
  /** Optional loading message to display below spinner */
  message?: string;
}

/**
 * Full-screen loading indicator with optional message
 *
 * @example
 * if (loading) {
 *   return <LoadingScreen message="Loading trip details..." />;
 * }
 */
export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  loadingText: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
});
