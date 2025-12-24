/**
 * UI COMPONENT - CategoryPieChart
 * UI/UX ENGINEER: Themed pie chart for category spending visualization
 */

import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { Pie, PolarChart } from "victory-native";
import { useFont } from "@shopify/react-native-skia";
import { theme } from "@ui/theme";

export interface CategoryPieData {
  categoryName: string;
  amount: number;
  percentage: number;
  color?: string;
  emoji?: string;
}

interface CategoryPieChartProps {
  data: CategoryPieData[];
  size?: number;
  showLabels?: boolean;
  onSlicePress?: (category: CategoryPieData) => void;
  innerRadius?: number;
  accessibilityLabel?: string;
}

/**
 * CategoryPieChart component
 * Displays category spending as a pie/donut chart with theme styling
 */
export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  data,
  size = 200,
  showLabels = false,
  onSlicePress,
  innerRadius = 0,
  accessibilityLabel,
}) => {
  // Load font for labels - use a font from node_modules
  const font = useFont(
    require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf"),
    14
  );

  // Don't render if no data
  if (!data || data.length === 0) {
    return null;
  }

  // Simple hash function for consistent color assignment
  const hashString = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

  // Transform data for Victory Native
  const chartData = data.map((item) => {
    // Use category name to deterministically pick a color
    const colorIndex = item.color
      ? theme.colors.chartColors.indexOf(item.color)
      : hashString(item.categoryName) % theme.colors.chartColors.length;

    return {
      value: item.amount,
      color: item.color || theme.colors.chartColors[colorIndex],
      label: item.emoji || item.categoryName,
      percentage: item.percentage,
      originalData: item,
    };
  });

  // Don't render until font is loaded
  if (!font) {
    return null;
  }

  const computedAccessibilityLabel =
    accessibilityLabel ||
    `Category spending pie chart with ${data.length} categories`;

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessible
      accessibilityLabel={computedAccessibilityLabel}
    >
      <View style={{ flex: 1, width: size, height: size }}>
        <PolarChart
          data={chartData}
          labelKey="label"
          valueKey="value"
          colorKey="color"
        >
          <Pie.Chart innerRadius={innerRadius} />
        </PolarChart>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});
