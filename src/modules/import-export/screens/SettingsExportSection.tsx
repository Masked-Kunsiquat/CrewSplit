/**
 * UI/UX ENGINEER: Settings Export Section
 * Compact component for embedding backup/restore functionality in Settings screen
 */

import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "@ui/theme";
import { Button, Card } from "@ui/components";
import { useExport } from "../hooks/use-export";
import { useImport } from "../hooks/use-import";

export interface SettingsExportSectionProps {
  /**
   * Optional callback when export completes successfully
   */
  onExportComplete?: () => void;

  /**
   * Optional callback when import completes successfully
   */
  onImportComplete?: () => void;
}

/**
 * SettingsExportSection
 *
 * Compact UI section for quick backup and restore operations.
 * Designed to be embedded in the main Settings screen.
 *
 * Features:
 * - "Backup Database" button (exports full database)
 * - "Restore from Backup" button (imports from file)
 * - Minimal UI with loading states
 *
 * @example
 * // In your Settings screen:
 * <SettingsExportSection
 *   onExportComplete={() => console.log('Backup created')}
 *   onImportComplete={() => console.log('Data restored')}
 * />
 */
export function SettingsExportSection({
  onExportComplete,
  onImportComplete,
}: SettingsExportSectionProps) {
  const { exportFullDatabase, isExporting, error: exportError } = useExport();
  const { importFromFile, isImporting, error: importError } = useImport();

  // Track when operations were in progress to detect completion
  const wasExportingRef = useRef(false);
  const wasImportingRef = useRef(false);

  // Detect successful export completion
  useEffect(() => {
    // If was exporting and now finished, check for success
    if (wasExportingRef.current && !isExporting) {
      // Only call callback if no error occurred
      if (!exportError) {
        onExportComplete?.();
      }
    }
    wasExportingRef.current = isExporting;
  }, [isExporting, exportError, onExportComplete]);

  // Detect successful import completion
  useEffect(() => {
    // If was importing and now finished, check for success
    if (wasImportingRef.current && !isImporting) {
      // Only call callback if no error occurred
      if (!importError) {
        onImportComplete?.();
      }
    }
    wasImportingRef.current = isImporting;
  }, [isImporting, importError, onImportComplete]);

  const handleBackup = async () => {
    await exportFullDatabase({
      includeSampleData: false,
      includeArchivedData: true,
    });
    // Callback is called by useEffect when operation completes successfully
  };

  const handleRestore = async () => {
    await importFromFile("skip", {
      validateForeignKeys: true,
      dryRun: false,
    });
    // Callback is called by useEffect when operation completes successfully
  };

  const isOperating = isExporting || isImporting;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>💾</Text>
        <View style={styles.headerText}>
          <Text style={styles.title}>Backup & Restore</Text>
          <Text style={styles.description}>
            Export your data for safekeeping or restore from a previous backup
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title={isExporting ? "Creating Backup..." : "Backup Database"}
          onPress={handleBackup}
          disabled={isOperating}
          loading={isExporting}
          variant="primary"
          fullWidth
          accessibilityLabel="Backup database"
          accessibilityHint="Creates a complete backup of all your data"
        />

        <Button
          title={isImporting ? "Restoring..." : "Restore from Backup"}
          onPress={handleRestore}
          disabled={isOperating}
          loading={isImporting}
          variant="outline"
          fullWidth
          accessibilityLabel="Restore from backup"
          accessibilityHint="Opens file picker to restore data from a backup file"
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerIcon}>💡</Text>
        <Text style={styles.footerText}>
          Tip: Regular backups help protect your data. Store backup files
          safely.
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
  },
  icon: {
    fontSize: theme.typography.xxl,
  },
  headerText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  description: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  actions: {
    gap: theme.spacing.md,
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerIcon: {
    fontSize: theme.typography.base,
  },
  footerText: {
    flex: 1,
    fontSize: theme.typography.xs,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
});
