import React, { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@ui/components";
import { theme } from "@ui/theme";
// eslint-disable-next-line import/no-unresolved
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useOnboardingState } from "@modules/onboarding/hooks/use-onboarding-state";
import { SampleDataService } from "@modules/onboarding/services/SampleDataService";

const { width } = Dimensions.get("window");

const WALKTHROUGH_STEPS = [
  {
    icon: "briefcase-plus-outline",
    title: "Create Trips",
    description: "Start by creating a new trip for your group.",
  },
  {
    icon: "receipt-text-plus-outline",
    title: "Add Expenses",
    description: "Log expenses as you go, in any currency.",
  },
  {
    icon: "chart-pie-outline",
    title: "Split Options",
    description: "Split by equal, exact, percentage, and more.",
  },
  {
    icon: "scale-balance",
    title: "Settlement View",
    description: "See who owes who to easily settle up.",
  },
  {
    icon: "currency-eur",
    title: "Multi-currency",
    description: "Use different currencies within the same trip.",
  },
];

type ProgressDotsProps = {
  steps: unknown[];
  activeIndex: number;
};

const ProgressDots = ({ steps, activeIndex }: ProgressDotsProps) => (
  <View style={styles.dotsContainer}>
    {steps.map((_, index) => (
      <View
        key={index}
        style={[styles.dot, activeIndex === index && styles.activeDot]}
      />
    ))}
  </View>
);

export default function WalkthroughScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { markComplete, loading } = useOnboardingState();
  const insets = useSafeAreaInsets();

  const handleScroll = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  const handleNext = () => {
    if (activeIndex < WALKTHROUGH_STEPS.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: width * (activeIndex + 1),
        animated: true,
      });
    }
  };

  const handleFinish = async () => {
    const sampleDataService = new SampleDataService();
    await sampleDataService.loadSampleTrip("summer_road_trip");
    await markComplete();
    router.replace("/");
  };

  const handleSkip = handleFinish;

  const isLastStep = activeIndex === WALKTHROUGH_STEPS.length - 1;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <Button
        title="Skip"
        onPress={handleSkip}
        variant="ghost"
        style={[styles.skipButton, { top: insets.top + theme.spacing.sm }]}
        disabled={loading}
      />
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {WALKTHROUGH_STEPS.map((step, index) => (
          <View key={index} style={styles.slide}>
            <MaterialCommunityIcons
              name={step.icon}
              size={100}
              color={theme.colors.primary}
            />
            <Text style={styles.slideTitle}>{step.title}</Text>
            <Text style={styles.slideDescription}>{step.description}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <ProgressDots steps={WALKTHROUGH_STEPS} activeIndex={activeIndex} />
        <Button
          title={
            isLastStep
              ? loading
                ? "Getting things ready..."
                : "Get Started"
              : "Next"
          }
          onPress={isLastStep ? handleFinish : handleNext}
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
  },
  skipButton: {
    position: "absolute",
    top: 40,
    right: 10,
    zIndex: 1,
  },
  slide: {
    width,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  slideTitle: {
    fontSize: theme.typography.h2,
    fontWeight: "bold",
    color: theme.colors.text,
    textAlign: "center",
  },
  slideDescription: {
    fontSize: theme.typography.lg,
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  footer: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
    alignItems: "center",
  },
  dotsContainer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  activeDot: {
    backgroundColor: theme.colors.primary,
  },
});
