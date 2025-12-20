import React, { useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@ui/components";
import { theme } from "@ui/theme";
// @ts-expect-error @expo/vector-icons lacks TypeScript definitions
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

/**
 * Displays a horizontal, paged onboarding walkthrough with progress dots and actions to advance, skip, or finish onboarding.
 *
 * The screen presents a sequence of steps (icon, title, description), a "Skip" action, and a primary action that shows "Next" while advancing pages or "Get Started" on the last step. Completing onboarding attempts to load sample data, marks onboarding as complete, and navigates to the app root; failures show an alert with the error message.
 *
 * @returns The rendered walkthrough screen as a React element
 */
export default function WalkthroughScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { markComplete, loading } = useOnboardingState();
  const [isFinishing, setIsFinishing] = useState(false);
  const insets = useSafeAreaInsets();

  const handleScroll = (event: any) => {
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
    if (isFinishing) {
      return;
    }
    setIsFinishing(true);
    try {
      const sampleDataService = new SampleDataService();
      await sampleDataService.loadSampleTrip("summer_road_trip");
      await markComplete();
      router.replace("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to complete onboarding", error);
      Alert.alert("Couldn't finish onboarding", `Please try again. ${message}`);
    } finally {
      setIsFinishing(false);
    }
  };

  const handleSkip = handleFinish;

  const isLastStep = activeIndex === WALKTHROUGH_STEPS.length - 1;
  const isBusy = loading || isFinishing;

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
      <View style={[styles.skipButton, { top: insets.top + theme.spacing.sm }]}>
        <Button
          title="Skip"
          onPress={handleSkip}
          variant="ghost"
          disabled={isBusy}
        />
      </View>
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
              ? isBusy
                ? "Getting things ready..."
                : "Get Started"
              : "Next"
          }
          onPress={isLastStep ? handleFinish : handleNext}
          fullWidth
          disabled={isBusy}
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
    fontSize: theme.typography.xxl,
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
