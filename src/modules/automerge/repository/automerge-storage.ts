/**
 * AUTOMERGE MODULE - Storage Repository
 * LOCAL DATA ENGINEER: Filesystem persistence for Automerge documents
 * REPOSITORY LAYER: Storage only, no business logic
 *
 * Handles reading and writing Automerge documents to the filesystem.
 * Uses expo-file-system for file operations.
 */

import * as FileSystem from "expo-file-system";
import * as Automerge from "@automerge/automerge";
import { createAppError } from "@utils/errors";
import type { LoadDocResult, SaveDocOptions } from "../types";

/**
 * Base directory for storing Automerge documents
 */
const AUTOMERGE_DOCS_DIR = `${FileSystem.documentDirectory}automerge-docs/`;

/**
 * Get the file path for a trip's Automerge document
 *
 * @param tripId - Trip UUID
 * @returns Full file path for the trip's Automerge document
 *
 * @example
 * getDocFilePath('trip-123')
 * // Returns: 'file:///data/.../automerge-docs/trip-trip-123.automerge'
 */
function getDocFilePath(tripId: string): string {
  return `${AUTOMERGE_DOCS_DIR}trip-${tripId}.automerge`;
}

/**
 * Ensures the Automerge documents directory exists
 *
 * @throws Error if directory creation fails
 */
async function ensureDirectoryExists(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(AUTOMERGE_DOCS_DIR);

  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(AUTOMERGE_DOCS_DIR, {
      intermediates: true,
    });
  }
}

/**
 * Saves an Automerge document to the filesystem
 *
 * Serializes the Automerge document to binary format and writes it to disk.
 * Creates the directory if it doesn't exist.
 *
 * @param tripId - Trip UUID
 * @param doc - Automerge document to save
 * @param options - Save options
 *
 * @throws Error with code SAVE_FAILED if filesystem operation fails
 *
 * @example
 * const doc = Automerge.from({ id: 'trip-123', name: 'Paris' });
 * await saveDoc('trip-123', doc);
 */
export async function saveDoc<T>(
  tripId: string,
  doc: Automerge.Doc<T>,
  options: SaveDocOptions = {},
): Promise<void> {
  try {
    await ensureDirectoryExists();

    const filePath = getDocFilePath(tripId);

    // Serialize the document to binary
    const binary = Automerge.save(doc);

    // Convert to base64 for storage (expo-file-system requirement)
    const base64 = btoa(String.fromCharCode(...binary));

    // Write to filesystem
    await FileSystem.writeAsStringAsync(filePath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (error) {
    throw createAppError(
      "SAVE_FAILED",
      `Failed to save Automerge document for trip ${tripId}`,
      {
        details: {
          tripId,
          error: error instanceof Error ? error.message : String(error),
        },
      },
    );
  }
}

/**
 * Loads an Automerge document from the filesystem
 *
 * Reads the binary file and deserializes it into an Automerge document.
 * Returns exists: false if the file doesn't exist.
 *
 * @param tripId - Trip UUID
 * @returns LoadDocResult with the document and exists flag
 *
 * @throws Error with code LOAD_FAILED if deserialization fails
 *
 * @example
 * const result = await loadDoc<TripAutomergeDoc>('trip-123');
 * if (result.exists) {
 *   console.log(result.doc.name);
 * }
 */
export async function loadDoc<T>(tripId: string): Promise<LoadDocResult<Automerge.Doc<T>>> {
  const filePath = getDocFilePath(tripId);

  // Check if file exists
  const fileInfo = await FileSystem.getInfoAsync(filePath);

  if (!fileInfo.exists) {
    // Return an empty Automerge document
    return {
      doc: Automerge.init<T>(),
      exists: false,
    };
  }

  try {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to binary
    const binaryString = atob(base64);
    const binary = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      binary[i] = binaryString.charCodeAt(i);
    }

    // Deserialize the document
    const doc = Automerge.load<T>(binary);

    return {
      doc,
      exists: true,
    };
  } catch (error) {
    throw createAppError(
      "LOAD_FAILED",
      `Failed to load Automerge document for trip ${tripId}`,
      {
        details: {
          tripId,
          error: error instanceof Error ? error.message : String(error),
        },
      },
    );
  }
}

/**
 * Deletes an Automerge document from the filesystem
 *
 * @param tripId - Trip UUID
 *
 * @throws Error if deletion fails
 *
 * @example
 * await deleteDoc('trip-123');
 */
export async function deleteDoc(tripId: string): Promise<void> {
  const filePath = getDocFilePath(tripId);

  const fileInfo = await FileSystem.getInfoAsync(filePath);

  if (fileInfo.exists) {
    await FileSystem.deleteAsync(filePath);
  }
}

/**
 * Checks if an Automerge document exists for a trip
 *
 * @param tripId - Trip UUID
 * @returns true if document exists, false otherwise
 *
 * @example
 * const exists = await docExists('trip-123');
 */
export async function docExists(tripId: string): Promise<boolean> {
  const filePath = getDocFilePath(tripId);
  const fileInfo = await FileSystem.getInfoAsync(filePath);
  return fileInfo.exists;
}

/**
 * Lists all Automerge document files
 *
 * @returns Array of trip IDs that have Automerge documents
 *
 * @example
 * const tripIds = await listDocs();
 * // Returns: ['trip-123', 'trip-456']
 */
export async function listDocs(): Promise<string[]> {
  await ensureDirectoryExists();

  const files = await FileSystem.readDirectoryAsync(AUTOMERGE_DOCS_DIR);

  // Extract trip IDs from filenames (trip-{tripId}.automerge)
  return files
    .filter((file) => file.startsWith("trip-") && file.endsWith(".automerge"))
    .map((file) => file.replace("trip-", "").replace(".automerge", ""));
}
