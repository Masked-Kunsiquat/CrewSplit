# Database Migrations

CrewSplit uses Drizzle Kit migrations (Expo-compatible) to evolve the SQLite schema **without data loss**.

## Migration Philosophy

**NEVER wipe user data.** All schema changes must be:
1. **Backward compatible** when possible
2. **Additive** (new columns/tables) rather than destructive
3. **Tested** with existing data before shipping

## Generate Migrations

Run in Windows (not WSL) from the repo root so esbuild matches your platform:

```bash
npx drizzle-kit generate --config drizzle.config.ts
```

Outputs live in `src/db/migrations/`:
- `meta/_journal.json` - Migration tracking
- `migrations.js` - Inlined SQL for React Native
- `NNNN_*.sql` - Human-readable SQL files

**Commit all generated files** together with schema changes.

## Apply Migrations In-App

- `metro.config.js` bundles `.sql` files via `assetExts`
- `src/db/client.ts` exposes `useDbMigrations()` which wraps `useMigrations(db, migrations)`
- `app/_layout.tsx` blocks rendering until migrations succeed
- Drizzle tracks applied migrations in `__drizzle_migrations` table (auto-created)
- **Idempotent:** Re-running migrations only applies new ones

## Safe Schema Change Patterns

### ✅ SAFE: Adding nullable columns
```typescript
// schema/trips.ts
export const trips = sqliteTable('trips', {
  // ... existing columns
  notes: text('notes'), // NULL by default - safe for existing rows
});
```

### ✅ SAFE: Adding columns with defaults
```typescript
export const trips = sqliteTable('trips', {
  // ... existing columns
  status: text('status').default('active').notNull(), // Default applies to existing rows
});
```

### ✅ SAFE: Adding new tables
```typescript
export const tripTags = sqliteTable('trip_tags', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull().references(() => trips.id),
  tag: text('tag').notNull(),
});
```

### ⚠️ REQUIRES DATA MIGRATION: Adding NOT NULL columns
```typescript
// ❌ BAD: Will fail if table has existing rows
export const trips = sqliteTable('trips', {
  category: text('category').notNull(), // No default - breaks existing data!
});

// ✅ GOOD: Multi-step migration
// Step 1: Add nullable column
export const trips = sqliteTable('trips', {
  category: text('category'),
});
// Step 2: Write data migration to populate values
// Step 3: Add NOT NULL constraint in follow-up migration
```

### ⚠️ REQUIRES CAREFUL TESTING: Renaming columns
```sql
-- SQLite doesn't support RENAME COLUMN in older versions
-- Drizzle generates ALTER TABLE RENAME COLUMN (works on modern SQLite)
-- Test thoroughly on target devices
```

### 🚫 AVOID: Dropping columns with data
```sql
-- Only drop columns if:
-- 1. Column was just added and no production data exists
-- 2. You've verified no users have data in that column
-- 3. You've created a backup migration path
```

## Checklist for Schema Changes

1. **Update schema** files in `src/db/schema/`
2. **Generate migration**: `npx drizzle-kit generate`
3. **Review SQL** in generated `.sql` file:
   - Check for `DROP` statements (dangerous!)
   - Verify defaults for new NOT NULL columns
   - Ensure foreign key constraints won't fail
4. **Update `migrations.js`**: Copy SQL content to new `mXXXX` variable
5. **Test locally**:
   - Create dummy data
   - Restart app to trigger migration
   - Verify data preserved and schema correct
6. **Commit** `src/db/migrations/` changes + schema updates together

## Migration Failure Recovery

If a migration fails in production:

1. **Check logs** - Error surfaced in `_layout.tsx`
2. **Fix schema** or **write corrective migration**
3. **Never manually edit** `__drizzle_migrations` table
4. **Test recovery** path with dummy data locally

## Emergency Reset (Development Only)

**For development only** - destroys all user data:

```typescript
// src/db/client.ts (temporary, never commit)
import { deleteDatabaseSync } from 'expo-sqlite';
deleteDatabaseSync('crewsplit.db');
```

Remove immediately after testing. **Never ship this code.**

## Notes

- Foreign keys enabled at open: `PRAGMA foreign_keys = ON`
- Initial migration (0000) includes indexes and update triggers
- Drizzle automatically handles migration ordering via journal
- Migrations run synchronously at app startup (intentional - ensures data integrity)
