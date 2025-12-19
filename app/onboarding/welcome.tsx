/**
 * ONBOARDING - Welcome Screen
 * Minimal placeholder flow to mark onboarding complete
 */

import { useRouter } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "@ui/components";
import { theme } from "@ui/theme";
import { useOnboardingState } from "@modules/onboarding/hooks/use-onboarding-state";

export default function OnboardingWelcomeScreen() {
  const router = useRouter();
  const { markComplete, loading } = useOnboardingState();

  const handleFinish = async () => {
    await markComplete();
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to CrewSplit</Text>
      <Text style={styles.description}>
        Onboarding is minimal for now. Tap finish to jump into your trips or
        restart later from Settings.
      </Text>

      <Button
        title={loading ? "Finishing..." : "Finish Onboarding"}
        onPress={handleFinish}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
  },
  title: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  description: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
});
