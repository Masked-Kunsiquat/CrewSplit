# Database Migrations

**LOCAL DATA ENGINEER**: Migration strategy for CrewSplit

## Current Approach

For MVP/initial development, we use **CREATE TABLE IF NOT EXISTS** statements in [client.ts](../client.ts) to initialize the schema on app startup. This is simple and works well for local-first SQLite databases.

## Migration Strategy

### Phase 1: Initial Schema (Current)

- Manual CREATE TABLE statements in `initializeDatabase()`
- Executed on every app start (idempotent)
- No migration files needed yet

### Phase 2: Schema Changes (Future)

When schema changes are needed, we will implement a proper migration system:

#### Option A: Drizzle Kit Migrations

```bash
# Generate migration from schema changes
npx drizzle-kit generate:sqlite

# Apply migrations programmatically
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
await migrate(db, { migrationsFolder: './src/db/migrations' });
```

#### Option B: Custom Migration System

Create a simple version-based migration system:

```typescript
// migrations/001_initial_schema.ts
export const up = async (db) => {
  await db.run(sql`CREATE TABLE ...`);
};

export const down = async (db) => {
  await db.run(sql`DROP TABLE ...`);
};
```

Track applied migrations in a `schema_migrations` table:

```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
```

## Best Practices

1. **Always test migrations** on a copy of production data
2. **Make migrations idempotent** where possible
3. **Provide rollback (down) migrations** for safety
4. **Never modify existing migrations** after they're deployed
5. **Use transactions** to ensure atomic schema changes

## Data Integrity

- **Foreign keys are enabled** via `PRAGMA foreign_keys = ON`
- **Cascade deletes** are configured for trips → participants/expenses
- **Restrict deletes** prevent removing participants with existing expenses
- **Indexes** are created for all foreign keys for performance

## Future Considerations

### For Sync Feature

When implementing the sync module, consider:

1. **Schema versioning** for compatibility across devices
2. **Conflict resolution** for concurrent schema updates
3. **Migration coordination** across synced devices

### For Testing

- Create fixtures for test data
- Support in-memory databases for fast tests
- Provide seed scripts for development

## Migration Checklist

When creating a new migration:

- [ ] Update schema files in `/src/db/schema/`
- [ ] Generate or write migration SQL
- [ ] Test migration on clean database
- [ ] Test migration on database with existing data
- [ ] Update this README with migration notes
- [ ] Document any breaking changes

## References

- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations)
- [SQLite Foreign Key Support](https://www.sqlite.org/foreignkeys.html)
- [Expo SQLite Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)
