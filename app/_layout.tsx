/**
 * ROOT LAYOUT
 * Expo Router entry point
 */

import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initializeDatabase } from '@db/client';

export default function RootLayout() {
  useEffect(() => {
    // Initialize database on app startup
    initializeDatabase().catch(console.error);
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1a1a1a',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: '#0a0a0a',
        },
      }}
    />
  );
}
