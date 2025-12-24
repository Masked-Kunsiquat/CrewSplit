/**
 * UI COMPONENTS - Statistics
 * UI/UX ENGINEER: Statistics display components
 */

/**
 * Reusable summary card for displaying key trip statistics.
 * Supports 2-column and grid layouts with optional press handlers.
 */
export { StatsSummaryCard } from "./StatsSummaryCard";
export type { StatItem } from "./StatsSummaryCard";

/**
 * Interactive bar chart for visualizing category spending.
 * Uses Victory Native with theme colors and touch interaction.
 */
export { CategoryBarChart } from "./CategoryBarChart";
export type { CategoryBarData } from "./CategoryBarChart";

/**
 * Pie/donut chart for category spending visualization.
 * Supports configurable inner radius and percentage labels.
 */
export { CategoryPieChart } from "./CategoryPieChart";
export type { CategoryPieData } from "./CategoryPieChart";

/**
 * Legend component for chart visualizations.
 * Displays color indicators with labels and optional values.
 */
export { ChartLegend } from "./ChartLegend";
export type { ChartLegendItem } from "./ChartLegend";

/**
 * List row for displaying participant balances with status indicators.
 * Shows avatar, name, balance with color coding, and optional Owes/Owed/Settled status.
 */
export { ParticipantBalanceRow } from "./ParticipantBalanceRow";
export type { ParticipantBalanceRowProps } from "./ParticipantBalanceRow";
