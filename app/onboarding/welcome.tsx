import React from "react";
import { useRouter } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "@ui/components";
import { theme } from "@ui/theme";
// eslint-disable-next-line import/no-unresolved
import { MaterialCommunityIcons } from "@expo/vector-icons";

const FeatureCard = ({ icon, title, description }) => (
  <View style={styles.featureCard}>
    <MaterialCommunityIcons
      name={icon}
      size={28}
      color={theme.colors.primary}
    />
    <View style={styles.featureTextContainer}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

export default function OnboardingWelcomeScreen() {
  const router = useRouter();

  const handleNext = () => {
    router.push("/onboarding/currency");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>👥💰</Text>
        <Text style={styles.title}>CrewSplit</Text>
        <Text style={styles.tagline}>Split expenses with zero friction</Text>
      </View>

      <View style={styles.featuresContainer}>
        <FeatureCard
          icon="calculator-variant"
          title="Deterministic Math"
          description="Guaranteed correctness for every split."
        />
        <FeatureCard
          icon="wifi-off"
          title="Works Offline"
          description="Create and manage trips with no internet."
        />
        <FeatureCard
          icon="currency-usd"
          title="Multi-Currency"
          description="Handle expenses in any currency."
        />
      </View>

      <View style={styles.footer}>
        <Button title="Get Started" onPress={handleNext} fullWidth />
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
    alignItems: "center",
    paddingTop: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  logo: {
    fontSize: 60,
  },
  title: {
    fontSize: theme.typography.h1,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  tagline: {
    fontSize: theme.typography.lg,
    color: theme.colors.textSecondary,
  },
  featuresContainer: {
    gap: theme.spacing.lg,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: theme.typography.lg,
    fontWeight: "600",
    color: theme.colors.text,
  },
  featureDescription: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
  },
  footer: {
    paddingBottom: theme.spacing.lg,
  },
});
