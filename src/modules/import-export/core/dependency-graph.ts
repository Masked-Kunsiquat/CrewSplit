/**
 * SYSTEM ARCHITECT: Dependency graph and topological sort
 * Ensures entities are exported/imported in correct order based on foreign keys
 */

import { ExportableEntity } from "./types";

/**
 * Topological sort using Kahn's algorithm
 * Returns entities in dependency order (dependencies first)
 * Throws error if circular dependencies are detected
 *
 * @param entities - Array of exportable entities
 * @returns Entities sorted by dependencies (parents before children)
 */
export function topologicalSort(
  entities: ExportableEntity[],
): ExportableEntity[] {
  // Build adjacency list and in-degree map
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  const entityMap = new Map<string, ExportableEntity>();

  // Initialize all entities
  for (const entity of entities) {
    entityMap.set(entity.name, entity);
    graph.set(entity.name, []);
    inDegree.set(entity.name, 0);
  }

  // Build dependency graph
  for (const entity of entities) {
    for (const dep of entity.dependencies) {
      if (!graph.has(dep)) {
        throw new Error(
          `Entity '${entity.name}' depends on unregistered entity '${dep}'`,
        );
      }
      // Add edge: dep -> entity (entity depends on dep)
      graph.get(dep)!.push(entity.name);
      inDegree.set(entity.name, inDegree.get(entity.name)! + 1);
    }
  }

  // Kahn's algorithm: start with entities with no dependencies
  const queue: string[] = [];
  const sorted: ExportableEntity[] = [];

  for (const [name, degree] of inDegree) {
    if (degree === 0) {
      queue.push(name);
    }
  }

  // Process queue
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(entityMap.get(current)!);

    // Reduce in-degree for neighbors
    for (const neighbor of graph.get(current)!) {
      const newDegree = inDegree.get(neighbor)! - 1;
      inDegree.set(neighbor, newDegree);

      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Check for circular dependencies
  if (sorted.length !== entities.length) {
    const remaining = entities
      .filter((e) => !sorted.includes(e))
      .map((e) => e.name);
    throw new Error(
      `Circular dependency detected among entities: ${remaining.join(", ")}`,
    );
  }

  return sorted;
}

/**
 * Get import order (reverse of export order)
 * Children must be imported before parents to avoid FK constraint violations
 *
 * @param entities - Array of exportable entities
 * @returns Entities in reverse dependency order (children before parents)
 */
export function getImportOrder(
  entities: ExportableEntity[],
): ExportableEntity[] {
  return topologicalSort(entities).slice().reverse();
}
