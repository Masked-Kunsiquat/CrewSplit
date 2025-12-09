/**
 * UI TOKENS - Colors
 * UI/UX ENGINEER: Dark-mode-first color system
 */

export const colors = {
  // Primary palette
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceElevated: '#2a2a2a',

  // Text
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  textMuted: '#666666',

  // Accent
  primary: '#4a9eff',
  primaryDark: '#2d7dd2',

  // Semantic colors
  success: '#4ade80',
  error: '#f87171',
  warning: '#fbbf24',

  // Borders
  border: '#333333',
  borderLight: '#404040',

  // States
  disabled: '#404040',
  hover: '#2d2d2d',
  pressed: '#242424',
} as const;

export type ColorToken = keyof typeof colors;
