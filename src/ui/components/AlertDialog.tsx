/**
 * UI COMPONENT - Alert Dialog
 * UI/UX ENGINEER: Themed alert/info modal (single button)
 * Thin wrapper around ConfirmDialog for simple OK alerts
 */

import React from "react";
import { ConfirmDialog } from "./ConfirmDialog";

export type AlertDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  onDismiss: () => void;
  buttonLabel?: string;
};

/**
 * Renders a themed alert/info dialog with a single dismiss button
 * Replaces React Native's Alert.alert with theme-compliant styling
 *
 * @param visible - Whether the dialog is shown
 * @param title - Dialog title
 * @param message - Dialog message/body
 * @param onDismiss - Called when dialog is dismissed (backdrop tap or button press)
 * @param buttonLabel - Button text (defaults to "OK")
 */
export function AlertDialog({
  visible,
  title,
  message,
  onDismiss,
  buttonLabel = "OK",
}: AlertDialogProps) {
  return (
    <ConfirmDialog
      visible={visible}
      title={title}
      message={message}
      confirmLabel={buttonLabel}
      onCancel={onDismiss}
      onConfirm={onDismiss}
      confirmVariant="primary"
      hideCancelButton
    />
  );
}
