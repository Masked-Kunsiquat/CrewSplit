import React, { useState } from "react";
import { useRouter } from "expo-router";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Input } from "@ui/components";
import { theme } from "@ui/theme";
import { useUserSettings } from "@modules/onboarding/hooks/use-user-settings";

export default function SetUserNameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const { updateSettings, loading } = useUserSettings();

  const handleNext = async () => {
    if (name.trim()) {
      await updateSettings({ primaryUserName: name.trim() });
    }
    router.push("/onboarding/walkthrough");
  };

  const handleSkip = () => {
    Alert.alert(
      "Skip for now?",
      "You can always set your name later in the app settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip",
          style: "default",
          onPress: () => router.push("/onboarding/walkthrough"),
        },
      ],
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: theme.spacing.lg + insets.top,
          paddingBottom: theme.spacing.lg + insets.bottom,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>What's Your Name?</Text>
        <Text style={styles.description}>
          This name will be used to automatically add you to new trips.
        </Text>
      </View>

      <Input
        placeholder="Enter your name"
        value={name}
        onChangeText={setName}
        autoFocus
        style={styles.input}
      />

      <View style={styles.footer}>
        <Button
          title={loading ? "Saving..." : "Next"}
          onPress={handleNext}
          disabled={!name.trim() || loading}
          fullWidth
        />
        <Button
          title="Skip"
          onPress={handleSkip}
          variant="ghost"
          fullWidth
          disabled={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    justifyContent: "space-between",
  },
  header: {
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.sm,
    alignItems: "center",
  },
  title: {
    fontSize: theme.typography.h2,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  description: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  input: {
    textAlign: "center",
    fontSize: theme.typography.h3,
    height: 60,
  },
  footer: {
    paddingBottom: 0,
    gap: theme.spacing.sm,
  },
});
