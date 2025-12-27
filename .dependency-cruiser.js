/**
 * Dependency Cruiser Configuration
 *
 * Enforces the three-layer architecture for CrewSplit:
 * - Engine layer: Pure functions with zero external dependencies
 * - Service layer: Orchestration, can import engine + repository
 * - Repository layer: Database access, can only import types + db
 * - Hooks layer: React integration, uses service layer
 * - Screens layer: UI components, uses hooks (never repositories)
 *
 * See REFACTOR_ROADMAP.md Issue #14 for details.
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ========================================
    // ENGINE LAYER PURITY RULES
    // ========================================
    {
      name: "engine-no-service",
      severity: "error",
      comment:
        "Engine layer must be pure - cannot import from service directories",
      from: {
        path: "^src/modules/.*/engine/",
      },
      to: {
        path: "^src/modules/.*/service/",
      },
    },
    {
      name: "engine-no-repository",
      severity: "error",
      comment:
        "Engine layer must be pure - cannot import from repository directories",
      from: {
        path: "^src/modules/.*/engine/",
      },
      to: {
        path: "^src/modules/.*/repository/",
      },
    },
    {
      name: "engine-no-hooks",
      severity: "error",
      comment: "Engine layer must be pure - cannot import React hooks",
      from: {
        path: "^src/modules/.*/engine/",
      },
      to: {
        path: "^src/modules/.*/hooks/",
      },
    },
    {
      name: "engine-no-react",
      severity: "error",
      comment: "Engine layer must be framework-agnostic - no React imports",
      from: {
        path: "^src/modules/.*/engine/",
      },
      to: {
        path: "^(react|react-native|react-dom)",
      },
    },
    {
      name: "engine-no-database",
      severity: "error",
      comment: "Engine layer cannot directly access database",
      from: {
        path: "^src/modules/.*/engine/",
      },
      to: {
        path: "^src/db/",
      },
    },
    {
      name: "engine-no-expo",
      severity: "error",
      comment: "Engine layer must be framework-agnostic - no Expo imports",
      from: {
        path: "^src/modules/.*/engine/",
      },
      to: {
        path: "^(expo|@expo)",
      },
    },

    // ========================================
    // SCREEN LAYER RULES
    // ========================================
    {
      name: "screen-no-repository",
      severity: "error",
      comment:
        "Screens should use hooks instead of importing repositories directly",
      from: {
        path: "^src/modules/.*/screens/",
      },
      to: {
        path: "^src/modules/.*/repository/",
      },
    },
    {
      name: "screen-no-service",
      severity: "error",
      comment:
        "Screens should use hooks instead of importing services directly",
      from: {
        path: "^src/modules/.*/screens/",
      },
      to: {
        path: "^src/modules/.*/service/",
      },
    },
    {
      name: "screen-no-database",
      severity: "error",
      comment: "Screens cannot directly access database",
      from: {
        path: "^src/modules/.*/screens/",
      },
      to: {
        path: "^src/db/",
      },
    },
    {
      name: "screen-no-engine",
      severity: "warn",
      comment:
        "Screens should generally use hooks; direct engine imports suggest missing abstraction",
      from: {
        path: "^src/modules/.*/screens/",
      },
      to: {
        path: "^src/modules/.*/engine/",
      },
    },

    // ========================================
    // COMPONENT LAYER RULES
    // ========================================
    {
      name: "component-no-repository",
      severity: "error",
      comment:
        "Components should use hooks instead of importing repositories directly",
      from: {
        path: "^src/(modules/.*/components|ui/components)/",
      },
      to: {
        path: "^src/modules/.*/repository/",
      },
    },
    {
      name: "component-no-service",
      severity: "error",
      comment:
        "Components should use hooks instead of importing services directly",
      from: {
        path: "^src/(modules/.*/components|ui/components)/",
      },
      to: {
        path: "^src/modules/.*/service/",
      },
    },
    {
      name: "component-no-database",
      severity: "error",
      comment: "Components cannot directly access database",
      from: {
        path: "^src/(modules/.*/components|ui/components)/",
      },
      to: {
        path: "^src/db/",
      },
    },

    // ========================================
    // REPOSITORY LAYER RULES
    // ========================================
    {
      name: "repository-no-service",
      severity: "error",
      comment:
        "Repositories cannot import services (creates circular dependency). Exception: type-only imports from service/types.ts are allowed for dependency inversion.",
      from: {
        path: "^src/modules/.*/repository/",
      },
      to: {
        path: "^src/modules/.*/service/",
        pathNot: "^src/modules/.*/service/types\\.ts$", // Allow importing interfaces for dependency inversion
      },
    },
    {
      name: "repository-no-hooks",
      severity: "error",
      comment: "Repositories cannot import React hooks",
      from: {
        path: "^src/modules/.*/repository/",
      },
      to: {
        path: "^src/modules/.*/hooks/",
      },
    },
    {
      name: "repository-no-engine",
      severity: "warn",
      comment:
        "Repositories should be pure CRUD - business logic belongs in service layer",
      from: {
        path: "^src/modules/.*/repository/",
      },
      to: {
        path: "^src/modules/.*/engine/",
      },
    },

    // ========================================
    // SERVICE LAYER RULES
    // ========================================
    {
      name: "service-no-hooks",
      severity: "error",
      comment:
        "Services cannot import React hooks (services are framework-agnostic)",
      from: {
        path: "^src/modules/.*/service/",
      },
      to: {
        path: "^src/modules/.*/hooks/",
      },
    },
    {
      name: "service-no-react",
      severity: "error",
      comment: "Services must be framework-agnostic - no React imports",
      from: {
        path: "^src/modules/.*/service/",
      },
      to: {
        path: "^(react|react-native|react-dom)",
      },
    },

    // ========================================
    // GENERAL RULES
    // ========================================
    {
      name: "no-circular",
      severity: "warn",
      comment: "Circular dependencies are not allowed",
      from: {},
      to: {
        circular: true,
      },
    },

    // ========================================
    // UTILITY LAYER RULES
    // ========================================
    {
      name: "utils-no-modules",
      severity: "warn",
      comment:
        "Utility functions should be framework-agnostic and not depend on modules",
      from: {
        path: "^src/utils/",
      },
      to: {
        path: "^src/modules/",
      },
    },
  ],

  options: {
    // Don't follow dependencies to these directories
    doNotFollow: {
      path: "node_modules",
    },

    // Exclude these from validation
    exclude: {
      path: "node_modules",
    },

    // Include external modules in analysis
    includeOnly: "^src",

    // TypeScript configuration
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "./tsconfig.json",
    },

    // Report all violations
    reporterOptions: {
      dot: {
        collapsePattern: "^src/modules/[^/]+",
      },
      archi: {
        collapsePattern: "^src/modules/([^/]+)/",
      },
    },
  },
};
