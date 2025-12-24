/**
 * UI TOKENS - Colors
 * UI/UX ENGINEER: Dark-mode-first color system
 */

export const colors = {
  // Primary palette
  background: "#0a0a0a",
  surface: "#1a1a1a",
  surfaceElevated: "#2a2a2a",

  // Text
  text: "#ffffff",
  textSecondary: "#a0a0a0",
  textMuted: "#666666",

  // Accent
  primary: "#4a9eff",
  primaryDark: "#2d7dd2",

  // Semantic colors
  success: "#4ade80",
  error: "#f87171",
  warning: "#fbbf24", // Saturated amber for accents/borders
  warningBg: "#3d2e1f", // Muted dark amber/bronze for banner backgrounds
  warningText: "#fbbf24", // Amber text for warnings (alias to warning for consistency)

  // Borders
  border: "#333333",
  borderLight: "#404040",

  // States
  disabled: "#404040",
  hover: "#2d2d2d",
  pressed: "#242424",

  // Chart colors - High contrast colors for data visualization on dark backgrounds
  chartColors: [
    "#4a9eff", // Primary blue (matches primary)
    "#4ade80", // Success green (matches success)
    "#f472b6", // Pink
    "#fbbf24", // Amber (matches warning)
    "#a78bfa", // Purple
    "#34d399", // Emerald
    "#fb923c", // Orange
    "#60a5fa", // Light blue
    "#f87171", // Red (matches error)
    "#c084fc", // Violet
    "#fbbf24", // Yellow
    "#22d3ee", // Cyan
  ],
} as const;

export type ColorToken = keyof typeof colors;
