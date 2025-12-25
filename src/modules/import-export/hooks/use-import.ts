/**
 * UI/UX ENGINEER: Import hook
 * React hook for importing trip and database data
 */

import { useState, useCallback } from "react";
import { ImportService } from "../service/ImportService";
import { ImportResult, ConflictStrategy } from "../core/types";
import { Alert } from "react-native";

interface ImportOptions {
  validateForeignKeys?: boolean;
  dryRun?: boolean;
}

interface UseImportReturn {
  /** Import data from file (shows file picker) */
  importFromFile: (
    conflictResolution?: ConflictStrategy,
    options?: ImportOptions,
  ) => Promise<void>;

  /** Preview import (dry run) */
  previewImport: (exportData: any) => Promise<{
    exportInfo: {
      version: string;
      scope: string;
      exportedAt: string;
      tripName?: string;
    };
    entities: { name: string; totalRecords: number; conflicts: number }[];
    totalRecords: number;
    totalConflicts: number;
  }>;

  /** Is import currently in progress */
  isImporting: boolean;

  /** Import results (after successful import) */
  results: ImportResult[] | null;

  /** Last import error (if any) */
  error: Error | null;

  /** Clear error and results */
  clearState: () => void;
}

/**
 * Hook for importing trip and database data
 * Handles file picking, loading state, and error reporting
 */
export function useImport(): UseImportReturn {
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const importFromFile = useCallback(
    async (
      conflictResolution: ConflictStrategy = "skip",
      options?: ImportOptions,
    ) => {
      setIsImporting(true);
      setError(null);
      setResults(null);

      try {
        const service = new ImportService();
        const importResults = await service.importFromFile(
          conflictResolution,
          options,
        );

        setResults(importResults);

        // Calculate summary
        const summary = service.getImportSummary(importResults);

        // Show success message
        if (summary.hasErrors) {
          Alert.alert(
            "Import Completed with Warnings",
            `Imported ${summary.successCount} of ${summary.totalRecords} records.\n\n` +
              `Skipped: ${summary.skippedCount}\n` +
              `Errors: ${summary.errorCount}\n\n` +
              `Check the import results for details.`,
            [{ text: "OK" }],
          );
        } else {
          Alert.alert(
            "Import Successful",
            `Successfully imported ${summary.successCount} record(s).\n` +
              (summary.skippedCount > 0
                ? `\nSkipped ${summary.skippedCount} duplicate(s).`
                : ""),
            [{ text: "OK" }],
          );
        }
      } catch (err) {
        const importError =
          err instanceof Error ? err : new Error("Import failed");
        setError(importError);

        // Show error alert
        Alert.alert(
          "Import Failed",
          importError.message || "An unknown error occurred during import.",
          [{ text: "OK" }],
        );
      } finally {
        setIsImporting(false);
      }
    },
    [],
  );

  const previewImport = useCallback(async (exportData: any) => {
    setIsImporting(true);
    setError(null);

    try {
      const service = new ImportService();
      const preview = await service.previewImport(exportData);
      return preview;
    } catch (err) {
      const previewError =
        err instanceof Error ? err : new Error("Preview failed");
      setError(previewError);
      throw previewError;
    } finally {
      setIsImporting(false);
    }
  }, []);

  const clearState = useCallback(() => {
    setError(null);
    setResults(null);
  }, []);

  return {
    importFromFile,
    previewImport,
    isImporting,
    results,
    error,
    clearState,
  };
}
