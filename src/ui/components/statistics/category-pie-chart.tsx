/**
 * UI COMPONENT - CategoryPieChart
 * UI/UX ENGINEER: Themed pie chart for category spending visualization
 */

import React from "react";
import { View, StyleSheet } from "react-native";
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
  // Load font for labels
  const font = useFont(
    require("../../../../assets/fonts/Roboto-Medium.ttf"),
    12
  );

  // Don't render if no data
  if (!data || data.length === 0) {
    return null;
  }

  // Transform data for Victory Native
  const chartData = data.map((item, index) => ({
    value: item.amount,
    color:
      item.color ||
      theme.colors.chartColors[index % theme.colors.chartColors.length],
    label: item.emoji || item.categoryName,
    percentage: item.percentage,
    originalData: item,
  }));

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
