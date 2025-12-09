/**
 * TRIP DASHBOARD SCREEN
 * UI/UX ENGINEER: Individual trip view
 */

import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, spacing, typography } from '@ui/tokens';

export default function TripDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Trip Dashboard</Text>
      <Text style={styles.subtitle}>Trip ID: {id}</Text>
    </View>
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
  text: {
    fontSize: typography.xl,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.base,
    color: colors.textSecondary,
  },
});
