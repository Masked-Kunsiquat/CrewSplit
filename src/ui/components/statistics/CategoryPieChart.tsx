/**
 * UI COMPONENT - CategoryPieChart
 * UI/UX ENGINEER: Themed pie chart for category spending visualization
 */

import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Pie, PolarChart } from "victory-native";
import { theme } from "../../theme";

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

  const computedAccessibilityLabel =
    accessibilityLabel ||
    `Category spending pie chart with ${data.length} categories`;

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessible
      accessibilityLabel={computedAccessibilityLabel}
    >
      <PolarChart
        data={chartData}
        labelKey="label"
        valueKey="value"
        colorKey="color"
      >
        <Pie.Chart innerRadius={innerRadius}>
          {({ slice }) => {
            const sliceIndex = chartData.findIndex(
              (d) => d.value === slice.value,
            );
            const percentage =
              sliceIndex !== -1 ? chartData[sliceIndex].percentage : 0;

            return (
              <TouchableOpacity
                onPress={() => {
                  if (onSlicePress && sliceIndex !== -1) {
                    onSlicePress(data[sliceIndex]);
                  }
                }}
                style={styles.slice}
              >
                {showLabels && <Pie.Label text={`${percentage.toFixed(0)}%`} />}
              </TouchableOpacity>
            );
          }}
        </Pie.Chart>
      </PolarChart>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  slice: {
    position: "relative",
  },
});
