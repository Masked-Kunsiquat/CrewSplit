/**
 * UI COMPONENT - CategoryBarChart
 * UI/UX ENGINEER: Themed bar chart for category spending visualization
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { CartesianChart, Bar, useChartPressState } from "victory-native";
import { theme } from "../../theme";

export interface CategoryBarData {
  categoryName: string;
  amount: number;
  color?: string;
  emoji?: string;
}

interface CategoryBarChartProps {
  data: CategoryBarData[];
  height?: number;
  onBarPress?: (category: CategoryBarData) => void;
  accessibilityLabel?: string;
}

/**
 * CategoryBarChart component
 * Displays category spending as a vertical bar chart with theme styling
 */
export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({
  data,
  height = 300,
  onBarPress,
  accessibilityLabel,
}) => {
  const { state, isActive } = useChartPressState({ x: 0, y: { amount: 0 } });

  // Transform data for Victory Native
  const chartData = data.map((item, index) => ({
    x: item.emoji || item.categoryName,
    amount: item.amount,
    color:
      item.color ||
      theme.colors.chartColors[index % theme.colors.chartColors.length],
    originalData: item,
  }));

  // Handle bar press
  React.useEffect(() => {
    if (isActive && state && onBarPress) {
      const xValue =
        typeof state.x.value === "number" ? state.x.value : state.x.value.value;
      const index = Math.round(xValue);
      if (index >= 0 && index < data.length) {
        onBarPress(data[index]);
      }
    }
  }, [isActive, state, onBarPress, data]);

  const computedAccessibilityLabel =
    accessibilityLabel ||
    `Category spending bar chart with ${data.length} categories`;

  return (
    <View
      style={[styles.container, { height }]}
      accessible
      accessibilityLabel={computedAccessibilityLabel}
    >
      <CartesianChart
        data={chartData}
        xKey="x"
        yKeys={["amount"]}
        domainPadding={{ left: 20, right: 20, top: 20, bottom: 20 }}
        axisOptions={{
          lineColor: theme.colors.border,
          tickCount: 5,
        }}
      >
        {({ points, chartBounds }) => (
          <Bar
            points={points.amount}
            chartBounds={chartBounds}
            color={theme.colors.primary}
            roundedCorners={{
              topLeft: 4,
              topRight: 4,
            }}
          />
        )}
      </CartesianChart>

      {/* Active bar indicator */}
      {isActive && state && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>
            {
              chartData[
                Math.round(
                  typeof state.x.value === "number"
                    ? state.x.value
                    : state.x.value.value,
                )
              ]?.x
            }
            :{" "}
            {
              chartData[
                Math.round(
                  typeof state.x.value === "number"
                    ? state.x.value
                    : state.x.value.value,
                )
              ]?.amount
            }
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    position: "relative",
  },
  tooltip: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tooltipText: {
    fontSize: theme.typography.sm,
    color: theme.colors.text,
  },
});
