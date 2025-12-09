/**
 * ROOT LAYOUT
 * Expo Router entry point
 */

import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { initializeDatabase } from '@db/client';
import { colors, spacing, typography } from '@ui/tokens';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeDatabase();
        setIsReady(true);
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize database');
      }
    };

    initApp();
  }, []);

  // Show loading state while database initializes
  if (!isReady) {
    if (error) {
      return (
        <View style={styles.container}>
          <Text style={styles.errorTitle}>Initialization Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  errorTitle: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
