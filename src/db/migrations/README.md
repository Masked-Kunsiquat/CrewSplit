# Database Migrations

CrewSplit uses Drizzle Kit migrations (Expo-compatible) to evolve the SQLite schema without destructive resets.

## Generate migrations

Run in Windows (not WSL) from the repo root so esbuild matches your platform:

```bash
npx drizzle-kit generate --config drizzle.config.ts
```

Outputs live in `src/db/migrations/` (`meta/_journal.json`, `migrations.js`, and numbered `.sql` files). Commit all generated files.

## Apply migrations in-app

- `metro.config.js` bundles `.sql` files via `assetExts`.
- `src/db/client.ts` exposes `useDbMigrations()` which wraps `useMigrations(db, migrations)`.
- `app/_layout.tsx` blocks rendering until migrations finish and surfaces errors if they fail.

## Notes

- Foreign keys are enabled at open (`PRAGMA foreign_keys = ON`).
- The initial migration includes indexes and timestamp update triggers carried over from the legacy bootstrap.
- Destructive resets on schema mismatches have been removed; rely on migrations for schema changes.

## Checklist for schema changes

1. Update schema files in `src/db/schema/`.
2. Run `npx drizzle-kit generate --config drizzle.config.ts`.
3. Verify the new SQL (especially constraints/indexes/triggers if added).
4. Commit `src/db/migrations/` changes alongside schema updates.
