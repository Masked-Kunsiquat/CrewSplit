import { Stack } from "expo-router";

/**
 * Defines the onboarding navigation layout using an Expo Router Stack.
 *
 * @returns A JSX element containing a Stack configured with no header and slide-from-right animation, with screens: `welcome`, `currency`, `username`, and `walkthrough`.
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="currency" />
      <Stack.Screen name="username" />
      <Stack.Screen name="walkthrough" />
    </Stack>
  );
}