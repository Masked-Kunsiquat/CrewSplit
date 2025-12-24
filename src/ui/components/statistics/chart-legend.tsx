/**
 * UI COMPONENT - ChartLegend
 * UI/UX ENGINEER: Legend component for chart visualizations
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../../theme";

export interface ChartLegendItem {
  label: string;
  color: string;
  value?: string;
  percentage?: number;
  icon?: React.ReactNode;
}

interface ChartLegendProps {
  items: ChartLegendItem[];
  layout?: "horizontal" | "vertical";
}

/**
 * ChartLegend component
 * Displays a legend for chart visualizations with color indicators
 */
export const ChartLegend: React.FC<ChartLegendProps> = ({
  items,
  layout = "vertical",
}) => {
  // Auto-determine layout based on item count if not specified
  const containerStyle = [
    styles.container,
    layout === "horizontal" && styles.containerHorizontal,
    layout === "vertical" && styles.containerVertical,
  ];

  return (
    <View style={containerStyle}>
      {items.map((item, index) => (
        <View
          key={`${item.label}-${index}`}
          style={styles.legendItem}
          accessible
          accessibilityLabel={`${item.label}: ${item.value || item.percentage ? `${item.value || `${item.percentage}%`}` : ""}`}
        >
          {item.icon ? (
            <View style={styles.iconContainer}>{item.icon}</View>
          ) : (
            <View
              style={[styles.colorIndicator, { backgroundColor: item.color }]}
            />
          )}
          <Text style={styles.label} numberOfLines={1}>
            {item.label}
          </Text>
          {(item.value || item.percentage !== undefined) && (
            <Text style={styles.value}>
              {item.value || `${item.percentage?.toFixed(0)}%`}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  containerHorizontal: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  containerVertical: {
    flexDirection: "column",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    minWidth: "45%",
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  iconContainer: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: theme.typography.sm,
    color: theme.colors.text,
    flex: 1,
  },
  value: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
});
