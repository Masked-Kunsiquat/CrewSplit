/**
 * UI THEME
 * UI/UX ENGINEER: Consolidated theme configuration
 */

import { colors } from "./tokens/colors";
import { spacing } from "./tokens/spacing";
import { typography } from "./tokens/typography";

/**
 * Touch target minimum size (iOS/Android accessibility guidelines)
 */
export const touchTarget = {
  minHeight: 44,
  minWidth: 44,
} as const;

/**
 * Border radius scale
 */
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

/**
 * Shadow depths (for elevated surfaces)
 */
export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
} as const;

/**
 * Common styles used across multiple screens
 * These are reusable style patterns to reduce duplication
 */
export const commonStyles = {
  /**
   * Standard screen container (flex: 1, background color)
   * Used in nearly all screens
   */
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  /**
   * Centered content wrapper (flex: 1, centered vertically/horizontally)
   * Used for loading screens, error screens, empty states
   */
  centerContent: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: spacing.lg,
  },
  /**
   * Screen footer with top border
   * Used for action buttons at bottom of screens
   */
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  /**
   * Error title text style
   * Used in error screens and error states
   */
  errorTitle: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.error,
    marginBottom: spacing.xs,
    textAlign: "center" as const,
  },
  /**
   * Loading text style
   * Used below spinners in loading screens
   */
  loadingText: {
    fontSize: typography.base,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  /**
   * Small display currency label
   * Used to show "(in USD)" or similar currency indicators
   */
  displayCurrencySmall: {
    fontSize: typography.xs,
    color: colors.textMuted,
    fontStyle: "italic" as const,
  },
} as const;

/**
 * Consolidated theme object
 */
export const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  touchTarget,
  shadows,
  commonStyles,
} as const;

export type Theme = typeof theme;
