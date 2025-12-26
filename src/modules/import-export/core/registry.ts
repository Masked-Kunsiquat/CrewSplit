/**
 * SYSTEM ARCHITECT: Central registry for exportable entities
 * Extensibility: New tables are registered here without modifying core export logic
 */

import { ExportableEntity, EntityScope } from "./types";
import { topologicalSort } from "./dependency-graph";
import { createAppError } from "@utils/errors";

/**
 * Entity registry - singleton pattern
 * Maintains a map of all registered exportable entities
 */
class EntityRegistry {
  private entities = new Map<string, ExportableEntity>();

  /**
   * Register an entity for export/import
   * Throws error if entity name already registered
   */
  register(entity: ExportableEntity): void {
    if (this.entities.has(entity.name)) {
      throw createAppError(
        "INVALID_INPUT",
        `Entity '${entity.name}' is already registered`,
      );
    }
    this.entities.set(entity.name, entity);
  }

  /**
   * Get entity by name
   * Returns undefined if not found
   */
  get(name: string): ExportableEntity | undefined {
    return this.entities.get(name);
  }

  /**
   * Get all registered entities
   */
  getAll(): ExportableEntity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Get entities filtered by scope
   * @param scope - Entity scope to filter by
   */
  getByScope(scope: EntityScope): ExportableEntity[] {
    return this.getAll().filter((e) => e.scope === scope || e.scope === "both");
  }

  /**
   * Get entities in dependency order (topological sort)
   * Dependencies are exported first (e.g., trips before participants)
   */
  getInDependencyOrder(): ExportableEntity[] {
    return topologicalSort(this.getAll());
  }

  /**
   * Clear all registered entities (for testing)
   */
  clear(): void {
    this.entities.clear();
  }

  /**
   * Get entity count
   */
  get size(): number {
    return this.entities.size;
  }
}

// Singleton instance
export const entityRegistry = new EntityRegistry();
