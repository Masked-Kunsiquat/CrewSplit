/**
 * UI/UX ENGINEER: DeleteTripCard component
 * Danger zone card for deleting a trip
 */

import React from "react";
import { Text, StyleSheet } from "react-native";
import { theme } from "@ui/theme";
import { Button, Card } from "@ui/components";

interface DeleteTripCardProps {
  isDeleting: boolean;
  onDelete: () => void;
}

export function DeleteTripCard({ isDeleting, onDelete }: DeleteTripCardProps) {
  return (
    <Card style={styles.deleteCard}>
      <Text style={styles.deleteWarning}>Danger Zone</Text>
      <Text style={styles.deleteDescription}>
        Deleting this trip will permanently remove all participants, expenses,
        and settlement data.
      </Text>
      <Button
        title={isDeleting ? "Deleting..." : "Delete Trip"}
        onPress={onDelete}
        fullWidth
        disabled={isDeleting}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  deleteCard: {
    backgroundColor: "#1a0000",
    borderColor: theme.colors.error,
    borderWidth: 2,
  },
  deleteWarning: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
    textAlign: "center",
  },
  deleteDescription: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
    textAlign: "center",
  },
});
