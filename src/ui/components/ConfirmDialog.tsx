/**
 * UI COMPONENT - Confirm Dialog
 * UI/UX ENGINEER: Themed confirmation modal.
 */

import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@ui/theme";
import { Button, type ButtonVariant } from "./Button";

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmVariant?: ButtonVariant;
  loading?: boolean;
  /** Hide cancel button (for simple alerts) */
  hideCancelButton?: boolean;
};

/**
 * Renders a modal confirmation dialog with Cancel and confirm actions.
 *
 * @param confirmLabel - Text for the confirm button when not loading
 * @param onCancel - Called when the dialog is dismissed or the Cancel action is pressed
 * @param onConfirm - Called when the confirm action is pressed
 * @param confirmVariant - Button variant for the confirm action
 * @param loading - When `true`, disables the confirm button and shows a working label
 * @param hideCancelButton - When `true`, only shows confirm button (for simple alerts)
 * @returns The confirmation dialog element to render in the component tree
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
  confirmVariant = "primary",
  loading,
  hideCancelButton = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {hideCancelButton ? (
            <Button
              title={loading ? "Working..." : confirmLabel}
              onPress={onConfirm}
              variant={confirmVariant}
              fullWidth
              disabled={loading}
            />
          ) : (
            <View style={styles.actions}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={onCancel}
                fullWidth
              />
              <Button
                title={loading ? "Working..." : confirmLabel}
                onPress={onConfirm}
                variant={confirmVariant}
                fullWidth
                disabled={loading}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 10, 10, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.lg,
  },
  title: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  message: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    gap: theme.spacing.sm,
  },
});
