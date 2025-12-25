/**
 * SYSTEM ARCHITECT: Export Service
 * High-level export orchestration for trip and full database exports
 */

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { entityRegistry } from "../core/registry";
import { ExportContext, ExportFile } from "../core/types";

/**
 * Export service - handles trip and full database exports
 */
export class ExportService {
  /**
   * Export a single trip with all related data
   * Includes: trip, participants, expenses, splits, settlements, categories, FX rates
   *
   * @param tripId - ID of trip to export
   * @param options - Export options
   * @returns File URI of exported JSON file
   */
  async exportTrip(
    tripId: string,
    options?: {
      includeSampleData?: boolean;
      includeArchivedData?: boolean;
    },
  ): Promise<string> {
    const context: ExportContext = {
      scope: "single_trip",
      tripId,
      includeSampleData: options?.includeSampleData ?? false,
      includeArchivedData: options?.includeArchivedData ?? false,
    };

    return this.performExport(context);
  }

  /**
   * Export full database (all trips and global data)
   *
   * @param options - Export options
   * @returns File URI of exported JSON file
   */
  async exportFullDatabase(options?: {
    includeSampleData?: boolean;
    includeArchivedData?: boolean;
  }): Promise<string> {
    const context: ExportContext = {
      scope: "full_database",
      includeSampleData: options?.includeSampleData ?? false,
      includeArchivedData: options?.includeArchivedData ?? false,
    };

    return this.performExport(context);
  }

  /**
   * Core export implementation
   * Orchestrates entity exports in dependency order
   *
   * @param context - Export context
   * @returns File URI of exported JSON file
   */
  private async performExport(context: ExportContext): Promise<string> {
    // Get entities in dependency order (parents before children)
    const entities = entityRegistry.getInDependencyOrder();

    // Export each entity
    const data: Record<string, any[]> = {};

    for (const entity of entities) {
      try {
        const records = await entity.export(context);
        data[entity.name] = records;
      } catch (error) {
        console.error(`Failed to export entity ${entity.name}:`, error);
        throw new Error(
          `Export failed for ${entity.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Build export file structure
    const exportData: ExportFile = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      appVersion: this.getAppVersion(),
      scope: context.scope,
      metadata: {
        tripId: context.tripId,
        tripName:
          context.scope === "single_trip" && data.trips?.length > 0
            ? data.trips[0].name
            : undefined,
        exportedBy: await this.getDeviceId(),
        checksum: this.calculateChecksum(data),
      },
      data,
    };

    // Write to file
    const fileName = this.generateFileName(
      context,
      exportData.metadata.tripName,
    );
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(exportData, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 },
    );

    // Share file (if sharing is available)
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/json",
        dialogTitle: "Export CrewSplit Data",
        UTI: "public.json",
      });
    }

    return fileUri;
  }

  /**
   * Generate export filename
   * Format: crewsplit-[scope]-[name]-[timestamp].json
   */
  private generateFileName(context: ExportContext, tripName?: string): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace(/T/, "_")
      .substring(0, 19); // YYYY-MM-DD_HH-MM-SS

    if (context.scope === "single_trip") {
      const safeTripName = tripName
        ? this.sanitizeFilename(tripName)
        : context.tripId?.substring(0, 8);
      return `crewsplit-trip-${safeTripName}-${timestamp}.json`;
    } else if (context.scope === "full_database") {
      return `crewsplit-backup-${timestamp}.json`;
    } else {
      return `crewsplit-global-${timestamp}.json`;
    }
  }

  /**
   * Sanitize trip name for use in filename
   * Remove special characters, limit length
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9-_]/g, "-") // Replace special chars with dash
      .replace(/-+/g, "-") // Collapse multiple dashes
      .replace(/^-|-$/g, "") // Remove leading/trailing dashes
      .substring(0, 30) // Limit length
      .toLowerCase();
  }

  /**
   * Calculate checksum for data integrity verification
   * Simple checksum: count of all records by entity
   */
  private calculateChecksum(data: Record<string, any[]>): string {
    const counts = Object.entries(data)
      .map(([entity, records]) => `${entity}:${records.length}`)
      .join(",");
    return counts;
  }

  /**
   * Get app version from environment
   */
  private getAppVersion(): string {
    // Try to get from environment variable (set in app.json)
    return process.env.EXPO_PUBLIC_APP_VERSION ?? "unknown";
  }

  /**
   * Get device identifier (for audit trail)
   * TODO: Implement proper device ID using expo-device or AsyncStorage
   */
  private async getDeviceId(): Promise<string> {
    // Placeholder - implement with expo-device or generate UUID on first run
    return "device-unknown";
  }
}
