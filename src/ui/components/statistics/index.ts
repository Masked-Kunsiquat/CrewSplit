/**
 * UI COMPONENTS - Statistics
 * UI/UX ENGINEER: Statistics display components
 */

/**
 * Reusable summary card for displaying key trip statistics.
 * Supports 2-column and grid layouts with optional press handlers.
 */
export { StatsSummaryCard } from "./stats-summary-card";
export type { StatItem } from "./stats-summary-card";

/**
 * Interactive bar chart for visualizing category spending.
 * Uses Victory Native with theme colors and touch interaction.
 */
export { CategoryBarChart } from "./category-bar-chart";
export type { CategoryBarData } from "./category-bar-chart";

/**
 * Pie/donut chart for category spending visualization.
 * Supports configurable inner radius and percentage labels.
 */
export { CategoryPieChart } from "./category-pie-chart";
export type { CategoryPieData } from "./category-pie-chart";

/**
 * Legend component for chart visualizations.
 * Displays color indicators with labels and optional values.
 */
export { ChartLegend } from "./chart-legend";
export type { ChartLegendItem } from "./chart-legend";

/**
 * List row for displaying participant balances with status indicators.
 * Shows avatar, name, balance with color coding, and optional Owes/Owed/Settled status.
 */
export { ParticipantBalanceRow } from "./participant-balance-row";
export type { ParticipantBalanceRowProps } from "./participant-balance-row";
