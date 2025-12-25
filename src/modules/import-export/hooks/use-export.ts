/**
 * UI/UX ENGINEER: Export hook
 * React hook for exporting trip and database data
 */

import { useState, useCallback } from "react";
import { ExportService } from "../service/ExportService";
import { Alert } from "react-native";

interface ExportOptions {
  includeSampleData?: boolean;
  includeArchivedData?: boolean;
}

interface UseExportReturn {
  /** Export a single trip */
  exportTrip: (tripId: string, options?: ExportOptions) => Promise<void>;

  /** Export full database */
  exportFullDatabase: (options?: ExportOptions) => Promise<void>;

  /** Is export currently in progress */
  isExporting: boolean;

  /** Last export error (if any) */
  error: Error | null;

  /** Clear error state */
  clearError: () => void;
}

/**
 * Hook for exporting trip and database data
 * Handles loading state and error reporting
 */
export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportTrip = useCallback(
    async (tripId: string, options?: ExportOptions) => {
      setIsExporting(true);
      setError(null);

      try {
        const service = new ExportService();
        await service.exportTrip(tripId, options);

        // Show success message
        Alert.alert(
          "Export Successful",
          "Trip data has been exported. You can now share the file with others.",
          [{ text: "OK" }],
        );
      } catch (err) {
        const exportError =
          err instanceof Error ? err : new Error("Export failed");
        setError(exportError);

        // Show error alert
        Alert.alert(
          "Export Failed",
          exportError.message || "An unknown error occurred during export.",
          [{ text: "OK" }],
        );
      } finally {
        setIsExporting(false);
      }
    },
    [],
  );

  const exportFullDatabase = useCallback(async (options?: ExportOptions) => {
    setIsExporting(true);
    setError(null);

    try {
      const service = new ExportService();
      await service.exportFullDatabase(options);

      // Show success message
      Alert.alert(
        "Backup Successful",
        "Your complete database has been exported. Keep this file safe for backup purposes.",
        [{ text: "OK" }],
      );
    } catch (err) {
      const exportError =
        err instanceof Error ? err : new Error("Export failed");
      setError(exportError);

      // Show error alert
      Alert.alert(
        "Backup Failed",
        exportError.message || "An unknown error occurred during backup.",
        [{ text: "OK" }],
      );
    } finally {
      setIsExporting(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    exportTrip,
    exportFullDatabase,
    isExporting,
    error,
    clearError,
  };
}
