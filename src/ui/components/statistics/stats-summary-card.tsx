/**
 * UI COMPONENT - StatsSummaryCard
 * UI/UX ENGINEER: Reusable summary card for displaying key trip statistics
 */

import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Card } from "../Card";
import { theme } from "../../theme";

export interface StatItem {
  label: string;
  value: string;
  valueColor?: string;
  accessibilityLabel?: string;
}

interface StatsSummaryCardProps {
  title: string;
  stats: StatItem[];
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * StatItem sub-component for rendering individual statistics
 */
const StatItemComponent: React.FC<StatItem> = ({
  label,
  value,
  valueColor,
  accessibilityLabel,
}) => {
  // Responsive text sizing based on value length
  const valueStyle = [
    styles.value,
    value.length > 15 && styles.valueLong,
    valueColor && { color: valueColor },
  ];

  const computedAccessibilityLabel = accessibilityLabel ?? `${label}: ${value}`;

  return (
    <View
      style={styles.statItem}
      accessible
      accessibilityLabel={computedAccessibilityLabel}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </View>
  );
};

/**
 * StatsSummaryCard component
 * Displays a summary card with key statistics in a responsive grid layout
 */
export const StatsSummaryCard: React.FC<StatsSummaryCardProps> = ({
  title,
  stats,
  onPress,
  style,
}) => {
  // Layout stats horizontally for 2 items, grid for 3+
  const statsContainerStyle = [
    styles.statsContainer,
    stats.length === 2 && styles.statsContainerTwoItems,
    stats.length >= 3 && styles.statsContainerGrid,
  ];

  return (
    <Card elevated onPress={onPress} style={style}>
      <Text style={styles.title}>{title}</Text>
      <View style={statsContainerStyle}>
        {stats.map((stat, index) => (
          <StatItemComponent key={`${stat.label}-${index}`} {...stat} />
        ))}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  statsContainer: {
    gap: theme.spacing.md,
  },
  statsContainerTwoItems: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statsContainerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  statItem: {
    flex: 1,
    minWidth: "45%",
  },
  label: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  value: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.text,
  },
  valueLong: {
    fontSize: theme.typography.lg,
  },
});
