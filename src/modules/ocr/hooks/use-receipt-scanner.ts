/**
 * OCR MODULE - Receipt Scanner Hook
 * UI/UX ENGINEER: React hook for OCR receipt scanning workflow
 */

import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import TextRecognition from "@infinitered/react-native-mlkit-text-recognition";
import { parseReceiptText } from "../services/receipt-parser";
import type { ParsedReceiptData, ScanResult } from "../types";

/**
 * Hook for scanning receipts with OCR
 * Handles camera permissions, image capture, OCR processing, and parsing
 *
 * @returns Object with scan function and loading state
 */
export function useReceiptScanner() {
  const [isScanning, setIsScanning] = useState(false);

  /**
   * Scan a receipt from camera or gallery
   *
   * @param source - "camera" to take photo, "gallery" to pick existing image
   * @returns Scan result with parsed data or error
   */
  const scanReceipt = async (
    source: "camera" | "gallery" = "camera",
  ): Promise<ScanResult> => {
    setIsScanning(true);

    try {
      // Request permissions
      const permissionResult =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        return {
          success: false,
          error: "Camera/gallery permission is required to scan receipts",
        };
      }

      // Capture or select image
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: "images",
              allowsEditing: false,
              quality: 1,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: "images",
              allowsEditing: false,
              quality: 1,
            });

      if (result.canceled || !result.assets[0]) {
        return {
          success: false,
          error: "Image capture was cancelled",
        };
      }

      const imageUri = result.assets[0].uri;

      // Perform OCR text recognition
      const ocrResult = await TextRecognition.recognize(imageUri);

      if (!ocrResult || !ocrResult.text) {
        return {
          success: false,
          error: "No text detected in image. Please try again with a clearer photo.",
        };
      }

      // Parse the OCR text into structured receipt data
      const parsedData = parseReceiptText(ocrResult.text);

      // Check if we got useful data
      if (parsedData.confidence < 0.3) {
        return {
          success: false,
          error: "Could not extract receipt information. Please enter manually.",
        };
      }

      return {
        success: true,
        data: parsedData,
      };
    } catch (error) {
      console.error("Receipt scanning error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to scan receipt. Please try again.",
      };
    } finally {
      setIsScanning(false);
    }
  };

  return {
    scanReceipt,
    isScanning,
  };
}
