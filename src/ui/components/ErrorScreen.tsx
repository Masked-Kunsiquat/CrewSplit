/**
 * UI COMPONENT: ErrorScreen
 * Reusable error state component with title, message, and optional action button
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "@ui/theme";
import { Button } from "./Button";

export interface ErrorScreenProps {
  /** Error title (e.g., "Trip Not Found") */
  title: string;
  /** Error message/description */
  message: string;
  /** Optional action button label */
  actionLabel?: string;
  /** Optional action button handler */
  onAction?: () => void;
}

/**
 * Full-screen error display with optional action button
 *
 * @example
 * if (error) {
 *   return (
 *     <ErrorScreen
 *       title="Trip Not Found"
 *       message="The trip you're looking for doesn't exist."
 *       actionLabel="Go Back"
 *       onAction={() => router.back()}
 *     />
 *   );
 * }
 */
export function ErrorScreen({
  title,
  message,
  actionLabel,
  onAction,
}: ErrorScreenProps) {
  return (
    <View style={theme.commonStyles.container}>
      <View style={theme.commonStyles.centerContent}>
        <Text style={theme.commonStyles.errorTitle}>{title}</Text>
        <Text style={styles.errorText}>{message}</Text>
        {actionLabel && onAction && (
          <View style={styles.button}>
            <Button title={actionLabel} onPress={onAction} variant="outline" />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  errorText: {
    fontSize: theme.typography.base,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  button: {
    marginTop: theme.spacing.md,
  },
});
