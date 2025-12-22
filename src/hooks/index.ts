/**
 * SHARED HOOKS - Public API
 * Cross-cutting hooks used across multiple modules
 *
 * Note: Domain-specific hooks have been relocated to their respective modules:
 * - use-device-owner → @modules/onboarding/hooks
 * - use-display-currency → @modules/settings/hooks
 */

export * from "./use-query";
export * from "./use-refresh-control";
