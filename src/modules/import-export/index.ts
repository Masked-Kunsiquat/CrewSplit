/**
 * SYSTEM ARCHITECT: Import/Export module - Main entry point
 * Bootstrap and public API for import/export system
 */

import { entityRegistry } from "./core/registry";

// Import all entity definitions
import { tripEntity } from "./entities/trip-entity";
import { participantEntity } from "./entities/participant-entity";
import { expenseCategoryEntity } from "./entities/expense-category-entity";
import { expenseEntity } from "./entities/expense-entity";
import { expenseSplitEntity } from "./entities/expense-split-entity";
import { fxRateEntity } from "./entities/fx-rate-entity";
import { settlementEntity } from "./entities/settlement-entity";

/**
 * Initialize import/export system
 * Registers all entities in the registry
 * Call this at app startup (in _layout.tsx or root provider)
 */
export function initializeImportExport(): void {
  // Register entities in any order (registry handles dependency sorting)
  // Order doesn't matter here - the registry will sort by dependencies
  entityRegistry.register(tripEntity);
  entityRegistry.register(participantEntity);
  entityRegistry.register(expenseCategoryEntity);
  entityRegistry.register(expenseEntity);
  entityRegistry.register(expenseSplitEntity);
  entityRegistry.register(fxRateEntity);
  entityRegistry.register(settlementEntity);

  console.log(
    `Import/Export system initialized: ${entityRegistry.size} entities registered`,
  );
}

// Public API exports
export { ExportService } from "./service/ExportService";
export { ImportService } from "./service/ImportService";

// Export types for consumers
export type {
  ExportContext,
  ImportContext,
  ImportResult,
  ConflictStrategy,
  ExportFile,
  ImportError,
  ValidationError,
} from "./core/types";

// Export errors for error handling
export {
  ImportExportError,
  ValidationException,
  ConflictException,
  MissingDependencyError,
  InvalidExportFileError,
  UnsupportedVersionError,
} from "./core/errors";

// Export registry (for advanced usage)
export { entityRegistry } from "./core/registry";

// Export hooks
export { useExport } from "./hooks/use-export";
export { useImport } from "./hooks/use-import";

// Export screens/components
export { default as ImportExportScreen } from "./screens/ImportExportScreen";
export { SettingsExportSection } from "./screens/SettingsExportSection";
export type { SettingsExportSectionProps } from "./screens/SettingsExportSection";
