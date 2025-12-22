/**
 * LOCAL DATA ENGINEER: Device Owner Hook
 * Manages the device owner's name stored in AsyncStorage
 * This identifies who owns this device and auto-adds them to new trips
 */

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { storageLogger } from "@utils/logger";

const DEVICE_OWNER_KEY = "@crewsplit_device_owner";

export function useDeviceOwner() {
  const [deviceOwnerName, setDeviceOwnerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load device owner name on mount
  useEffect(() => {
    let isMounted = true;

    const loadDeviceOwner = async () => {
      try {
        const name = await AsyncStorage.getItem(DEVICE_OWNER_KEY);
        if (isMounted) {
          setDeviceOwnerName(name);
        }
      } catch (error) {
        storageLogger.error("Failed to load device owner", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDeviceOwner();

    return () => {
      isMounted = false;
    };
  }, []);

  const setDeviceOwner = useCallback(async (name: string | null) => {
    try {
      if (name) {
        await AsyncStorage.setItem(DEVICE_OWNER_KEY, name.trim());
        setDeviceOwnerName(name.trim());
        storageLogger.info("Saved device owner", { name: name.trim() });
      } else {
        await AsyncStorage.removeItem(DEVICE_OWNER_KEY);
        setDeviceOwnerName(null);
        storageLogger.info("Cleared device owner");
      }
    } catch (error) {
      storageLogger.error("Failed to save device owner", error);
      throw error;
    }
  }, []);

  return {
    deviceOwnerName,
    loading,
    setDeviceOwner,
  };
}
