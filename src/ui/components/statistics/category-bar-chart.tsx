/**
 * UI COMPONENT - CategoryBarChart
 * UI/UX ENGINEER: Themed bar chart for category spending visualization
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { CartesianChart, Bar, useChartPressState } from "victory-native";
import { Circle, RoundedRect, Text as SkiaText, useFont } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
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
  const font = useFont(
    require("../../../../assets/fonts/Roboto-Medium.ttf"),
    14
  );

  const { state, isActive } = useChartPressState({ x: 0, y: { amount: 0 } });

  // Transform data for Victory Native
  const chartData = data.map((item, index) => ({
    x: index,
    label: item.emoji || item.categoryName,
    amount: item.amount,
    color:
      item.color ||
      theme.colors.chartColors[index % theme.colors.chartColors.length],
  }));

  // Derived tooltip text
  const tooltipText = useDerivedValue(() => {
    const index = Math.round(state.x.value.value);
    const item = chartData[index];
    if (!item) return "";
    return `${item.label}: ${item.amount}`;
  }, [state, chartData]);

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
        chartPressState={state}
      >
        {({ points, chartBounds }) => (
          <>
            {points.amount.map((point, index) => (
              <Bar
                key={`bar-${index}`}
                points={[point]}
                chartBounds={chartBounds}
                color={chartData[index]?.color || theme.colors.primary}
                roundedCorners={{
                  topLeft: 4,
                  topRight: 4,
                }}
              />
            ))}
            {isActive && font && (
              <>
                <Circle
                  cx={state.x.position}
                  cy={state.y.amount.position}
                  r={8}
                  color={theme.colors.primary}
                  opacity={0.8}
                />
                <RoundedRect
                  x={chartBounds.left + 10}
                  y={chartBounds.top + 10}
                  width={150}
                  height={30}
                  r={4}
                  color={theme.colors.surfaceElevated}
                />
                <SkiaText
                  x={chartBounds.left + 20}
                  y={chartBounds.top + 28}
                  text={tooltipText}
                  font={font}
                  color={theme.colors.text}
                />
              </>
            )}
          </>
        )}
      </CartesianChart>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
});
