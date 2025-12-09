/**
 * HOME SCREEN (Trips List)
 * UI/UX ENGINEER: Main landing screen
 */

import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@ui/tokens';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CrewSplit</Text>
      <Text style={styles.subtitle}>Your trips will appear here</Text>
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
  title: {
    fontSize: typography.xxxl,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.base,
    color: colors.textSecondary,
  },
});
