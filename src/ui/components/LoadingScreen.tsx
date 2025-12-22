/**
 * UI COMPONENT: LoadingScreen
 * Reusable loading state component with spinner and optional message
 */

import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { theme } from "@ui/theme";

export interface LoadingScreenProps {
  /** Optional loading message to display below spinner */
  message?: string;
}

/**
 * Full-screen loading indicator with optional message
 *
 * @example
 * if (loading) {
 *   return <LoadingScreen message="Loading trip details..." />;
 * }
 */
export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <View style={theme.commonStyles.container}>
      <View style={theme.commonStyles.centerContent}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={theme.commonStyles.loadingText}>{message}</Text>
      </View>
    </View>
  );
}
