/**
 * TRIP EXPORT - Share JSON
 * UI/UX ENGINEER + LOCAL DATA ENGINEER: Writes a deterministic JSON file and opens the share sheet.
 */

import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform, Share } from "react-native";
import { buildTripExportV1FromDb } from "./build-trip-export";
import { TripExportOptions } from "./types";
import { stableStringify } from "./stable-json";
import { createAppError } from "@utils/errors";

function sanitizeFileComponent(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function safeDeleteFile(fileUri: string) {
  try {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  } catch (error) {
    console.warn("[trip-export] Failed to delete temp export file", {
      fileUri,
      error,
    });
  }
}

export async function exportTripJsonToFileAndShare(
  tripId: string,
  options?: Partial<TripExportOptions>,
): Promise<{ fileUri: string; json: string }> {
  const exportPayload = await buildTripExportV1FromDb(tripId, options, {
    exportedAt: new Date().toISOString(),
    app: {
      name: Constants.expoConfig?.name,
      version: Constants.expoConfig?.version,
    },
  });

  const json = stableStringify(exportPayload, 2);

  const baseName = sanitizeFileComponent(exportPayload.trip.name || "trip");
  const date = exportPayload.meta.exportedAt.slice(0, 10);
  const fileName = `crewledger-${baseName || "trip"}-${date}.json`;

  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir)
    throw createAppError(
      "OPERATION_FAILED",
      "No writable directory available for export",
    );

  const fileUri = `${baseDir}${fileName}`;
  const shouldCleanup =
    typeof FileSystem.cacheDirectory === "string" &&
    fileUri.startsWith(FileSystem.cacheDirectory);

  try {
    await FileSystem.writeAsStringAsync(fileUri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (error) {
    console.warn("[trip-export] Failed to write export JSON to file", {
      fileUri,
      error,
    });
    throw error;
  }

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    try {
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/json",
        dialogTitle: "Export Trip",
        UTI: "public.json",
      });
      return { fileUri, json };
    } catch (error) {
      console.warn("[trip-export] Native file share failed", {
        fileUri,
        error,
      });
      throw error;
    } finally {
      if (shouldCleanup) await safeDeleteFile(fileUri);
    }
  }

  if (Platform.OS === "web") {
    Alert.alert(
      "Export Saved",
      `Export written to:\n${fileUri}\n\nSharing is not available on web in this build.`,
    );
    return { fileUri, json };
  }

  try {
    await Share.share({
      title: "Trip Export (JSON)",
      message: "CrewLedger trip export JSON file attached.",
      url: fileUri,
    });
    return { fileUri, json };
  } catch (error) {
    console.warn("[trip-export] Fallback share failed", { fileUri, error });
    throw error;
  } finally {
    if (shouldCleanup) await safeDeleteFile(fileUri);
  }
}
