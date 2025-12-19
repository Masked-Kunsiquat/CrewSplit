/**
 * ONBOARDING LAYOUT
 * Provides stack for onboarding screens
 */

import { Stack } from "expo-router";
import { colors } from "@ui/tokens";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surfaceElevated },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
