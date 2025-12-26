/**
 * UI/UX ENGINEER: Export hook
 * React hook for exporting trip and database data
 */

import { useState, useCallback } from "react";
import { ExportService } from "../service/ExportService";
import { createAppError } from "@utils/errors";

interface ExportOptions {
  includeSampleData?: boolean;
  includeArchivedData?: boolean;
}

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
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

  /** Alert dialog state (for themed alerts) */
  alert: AlertState;

  /** Dismiss alert dialog */
  dismissAlert: () => void;
}

/**
 * Hook for exporting trip and database data
 * Handles loading state and error reporting
 */
export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
  });

  const showAlert = useCallback((title: string, message: string) => {
    setAlert({ visible: true, title, message });
  }, []);

  const dismissAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, visible: false }));
  }, []);

  const exportTrip = useCallback(
    async (tripId: string, options?: ExportOptions) => {
      setIsExporting(true);
      setError(null);

      try {
        const service = new ExportService();
        await service.exportTrip(tripId, options);

        // Show success message
        showAlert(
          "Export Successful",
          "Trip data has been exported. You can now share the file with others.",
        );
      } catch (err) {
        const exportError =
          err instanceof Error
            ? err
            : createAppError("OPERATION_FAILED", "Export failed");
        setError(exportError);

        // Show error alert
        showAlert(
          "Export Failed",
          exportError.message || "An unknown error occurred during export.",
        );
      } finally {
        setIsExporting(false);
      }
    },
    [showAlert],
  );

  const exportFullDatabase = useCallback(
    async (options?: ExportOptions) => {
      setIsExporting(true);
      setError(null);

      try {
        const service = new ExportService();
        await service.exportFullDatabase(options);

        // Show success message
        showAlert(
          "Backup Successful",
          "Your complete database has been exported. Keep this file safe for backup purposes.",
        );
      } catch (err) {
        const exportError =
          err instanceof Error
            ? err
            : createAppError("OPERATION_FAILED", "Export failed");
        setError(exportError);

        // Show error alert
        showAlert(
          "Backup Failed",
          exportError.message || "An unknown error occurred during backup.",
        );
      } finally {
        setIsExporting(false);
      }
    },
    [showAlert],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    exportTrip,
    exportFullDatabase,
    isExporting,
    error,
    clearError,
    alert,
    dismissAlert,
  };
}
