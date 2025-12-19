/**
 * ONBOARDING - Welcome Screen
 * Minimal placeholder flow to mark onboarding complete
 */

import React, { useEffect } from "react";
import { useRouter, useNavigation } from "expo-router";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Button, Card } from "@ui/components";
import { theme } from "@ui/theme";
import { useOnboardingState } from "@modules/onboarding/hooks/use-onboarding-state";

export default function OnboardingWelcomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { markComplete, loading } = useOnboardingState();

  // Set header title
  useEffect(() => {
    navigation.setOptions({ title: "Welcome!" });
  }, [navigation]);

  const handleFinish = async () => {
    await markComplete();
    router.replace("/");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.kicker}>CrewSplit</Text>
        <Text style={styles.headline}>Ready to start splitting together.</Text>
        <Text style={styles.description}>
          We’ve kept the welcome flow light. Finish to jump into your trips now
          or restart any time from Settings.
        </Text>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>
            • Add your name so we can auto-fill payer
          </Text>
          <Text style={styles.bullet}>
            • Demo trips are preloaded — refresh or remove them from Settings
          </Text>
          <Text style={styles.bullet}>• Everything stays offline-first</Text>
        </View>
        <Button
          title={loading ? "Finishing..." : "Finish Onboarding"}
          onPress={handleFinish}
          fullWidth
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    justifyContent: "center",
    flexGrow: 1,
  },
  card: {
    gap: theme.spacing.md,
  },
  kicker: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headline: {
    fontSize: theme.typography.xxl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  description: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  bullets: {
    gap: theme.spacing.xs,
  },
  bullet: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});
