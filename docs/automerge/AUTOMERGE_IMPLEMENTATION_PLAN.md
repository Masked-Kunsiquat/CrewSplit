# Automerge Integration Implementation Plan

**Project:** CrewSplit
**Feature:** Automerge-based Data Layer with Built-in History Tracking
**Status:** Planning → Implementation
**Created:** 2025-12-29

---

## Table of Contents

- [Overview](#overview)
- [Goals & Non-Goals](#goals--non-goals)
- [Architecture](#architecture)
- [Module Structure](#module-structure)
- [Implementation Phases](#implementation-phases)
- [Data Model](#data-model)
- [Migration Strategy](#migration-strategy)
- [Testing Strategy](#testing-strategy)
- [Rollout Plan](#rollout-plan)

---

## Overview

This document outlines the plan to integrate **Automerge** as the source of truth for CrewSplit's data layer. Automerge is a CRDT (Conflict-free Replicated Data Type) library that provides:

1. **Built-in change tracking** - Every mutation is logged as an operation
2. **Deterministic merging** - Multiple users can edit offline and merge seamlessly
3. **Time travel** - Query document state at any point in history
4. **Collaboration-ready** - Sync between devices with minimal code changes

### Why Automerge?

**Current State:**
- SQLite is the source of truth
- No change history (only `createdAt`/`updatedAt` timestamps)
- No collaboration support
- Would need custom change tracking for audit logs

**With Automerge:**
- Automerge becomes source of truth
- **History tracking is free** (query operation log)
- SQLite becomes a performance cache (fast queries)
- Collaboration is a simple addition later (relay worker + sync messages)

---

## Goals & Non-Goals

### Goals

✅ **Primary:**
1. Integrate Automerge as the data source of truth
2. Provide full history/audit trail for all trip changes
3. Maintain deterministic, offline-first architecture
4. Keep SQLite as a query performance cache
5. Enable future collaboration with minimal code changes

✅ **Secondary:**
1. Build history UI (timeline view of changes)
2. Update import/export to include Automerge docs
3. Maintain or improve test coverage
4. Document migration process for future modules

### Non-Goals

❌ **Out of Scope:**
1. **Collaboration/sync implementation** (Phase 2, future work)
2. Real-time sync relay worker (Cloudflare Durable Objects)
3. Multi-user conflict resolution UI
4. User accounts or authentication

---

## Architecture

### Current Architecture (SQLite-Only)

```
User Action → SQLite (source of truth) → UI
                 ↑
          Repository Layer
```

### Target Architecture (Automerge-First)

```
User Action → Automerge Doc (source of truth) → SQLite (cache) → UI
                    ↓                                ↑
              Operation Log                    Cache Rebuild
                    ↓
              History Screen
```

**Key principles:**
1. **Automerge is authoritative** - All writes go through Automerge
2. **SQLite is derived** - Rebuilt from Automerge when needed
3. **Dual-write during transition** - Update both during migration
4. **History is native** - Query Automerge's operation log directly

---

## Module Structure

Following the **settlements module gold standard** from Architecture Guidelines:

```
src/modules/automerge/
├── engine/
│   ├── doc-schema.ts              # TypeScript types for Automerge doc structure
│   ├── doc-operations.ts          # Pure functions for doc mutations
│   └── history-parser.ts          # Parse Automerge ops → human-readable changes
├── service/
│   ├── AutomergeManager.ts        # Doc loading, saving, initialization
│   ├── SyncEngine.ts              # (Phase 2) Sync message handling
│   └── types.ts                   # Service interfaces
├── repository/
│   ├── automerge-storage.ts       # Filesystem persistence
│   ├── sqlite-cache-builder.ts   # Rebuild SQLite from Automerge
│   └── index.ts                   # Public API
├── hooks/
│   ├── use-automerge-doc.ts       # Load trip's Automerge doc
│   ├── use-trip-history.ts        # Query change history
│   └── index.ts
├── types.ts                        # Domain types
└── __tests__/
    ├── doc-operations.test.ts     # Unit: Pure functions
    ├── automerge-manager.test.ts  # Integration: Manager
    ├── history-parser.test.ts     # Unit: History parsing
    └── integration.test.ts        # End-to-end

src/modules/history/
├── engine/
│   └── format-changes.ts          # Pure: Format changes for UI
├── hooks/
│   └── use-formatted-history.ts   # Transform ops → UI-friendly
├── screens/
│   └── TripHistoryScreen.tsx      # Timeline UI
├── components/
│   ├── HistoryTimeline.tsx
│   ├── ChangeDetailCard.tsx
│   └── index.ts
├── types.ts
└── __tests__/
    └── format-changes.test.ts
```

### Layer Responsibilities

| Layer | Purpose | Dependencies | Examples |
|-------|---------|--------------|----------|
| **Engine** | Pure doc operations, history parsing | Types only | `doc-operations.ts`, `history-parser.ts` |
| **Service** | Doc lifecycle management | Engine, Repository, expo-file-system | `AutomergeManager.ts` |
| **Repository** | Storage (filesystem), cache rebuilding | Database, Automerge, expo-file-system | `automerge-storage.ts` |
| **Hooks** | React integration | Service, useState, useEffect | `use-automerge-doc.ts` |
| **Screens** | UI components | Hooks, components | `TripHistoryScreen.tsx` |

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal:** Set up Automerge infrastructure

**Tasks:**
1. Install dependencies
   - `@automerge/automerge`
   - `@automerge/automerge-repo` (optional, evaluate)
2. Create module structure (`src/modules/automerge/`)
3. Implement engine layer
   - `doc-schema.ts` - TypeScript types for doc structure
   - `doc-operations.ts` - Pure functions for CRUD operations
4. Implement service layer
   - `AutomergeManager.ts` - Doc loading/saving/initialization
5. Implement repository layer
   - `automerge-storage.ts` - Filesystem persistence (expo-file-system)
6. Write unit tests for engine functions

**Deliverables:**
- ✅ Automerge module structure created
- ✅ Can create/load/save Automerge docs to filesystem
- ✅ Engine functions tested (pure, deterministic)

**Acceptance Criteria:**
- Can create a new trip Automerge doc
- Can persist doc to filesystem
- Can load doc from filesystem
- All engine functions have >90% test coverage

---

### Phase 2: Migration & Dual-Write (Week 2)

**Goal:** Migrate existing SQLite data to Automerge, implement dual-write

**Tasks:**
1. Create migration script
   - Export all trips from SQLite to JSON
   - Import JSON into Automerge docs
   - Save Automerge docs to filesystem
2. Update existing repositories to dual-write
   - Trips: Write to both Automerge + SQLite
   - Participants: Write to both
   - Expenses: Write to both
3. Implement SQLite cache rebuilder
   - `sqlite-cache-builder.ts` - Rebuild SQLite from Automerge doc
   - Verify cache consistency (hash check)
4. Add integrity checks
   - Detect Automerge/SQLite desync
   - Trigger cache rebuild when needed
5. Test with sample data

**Deliverables:**
- ✅ Existing sample data migrated to Automerge
- ✅ All mutations write to both Automerge + SQLite
- ✅ SQLite can be rebuilt from Automerge
- ✅ Desync detection works

**Acceptance Criteria:**
- Sample data successfully migrated
- Creating expense updates both Automerge + SQLite
- Deleting SQLite and rebuilding from Automerge produces identical data
- No data loss during migration

---

### Phase 3: History Feature (Week 3)

**Goal:** Build history UI with Automerge operation log

**Tasks:**
1. Implement history engine
   - `history-parser.ts` - Parse Automerge ops → human-readable
   - `format-changes.ts` - Format changes for UI display
2. Create history hooks
   - `use-trip-history.ts` - Query Automerge operation log
   - `use-formatted-history.ts` - Transform ops for UI
3. Build history UI
   - `TripHistoryScreen.tsx` - Timeline view
   - `HistoryTimeline.tsx` - Chronological list
   - `ChangeDetailCard.tsx` - Expandable change details
4. Add History card to Trip Dashboard
   - Navigate to `TripHistoryScreen`
   - Show recent change count
5. Write tests for history parsing

**Deliverables:**
- ✅ History screen displays all changes chronologically
- ✅ Changes are human-readable (e.g., "Added John Doe to Dinner")
- ✅ Expandable detail cards show field-by-field changes
- ✅ Trip Dashboard has History card

**Acceptance Criteria:**
- History screen loads all changes for a trip
- Changes are sorted newest-first
- Expanding a card shows detailed field changes
- History updates in real-time when data changes

---

### Phase 4: Import/Export & Polish (Week 4)

**Goal:** Update import/export, final testing, documentation

**Tasks:**
1. Update import/export
   - Export: Include Automerge doc binary
   - Import: Load Automerge doc, rebuild SQLite cache
   - Backward compatibility: Handle old SQLite-only exports
2. Performance optimization
   - Lazy-load history (paginate if needed)
   - Optimize SQLite cache rebuild (incremental updates)
3. Comprehensive testing
   - Integration tests (full user flows)
   - Migration testing (verify data integrity)
   - Performance testing (large trips)
4. Documentation
   - Update CLAUDE.md with Automerge patterns
   - Create wiki page: "How Automerge Works"
   - Document migration process for other modules
5. Code review and cleanup

**Deliverables:**
- ✅ Import/export includes Automerge docs
- ✅ All tests passing (>90% coverage)
- ✅ Documentation updated
- ✅ Ready for production

**Acceptance Criteria:**
- Exported trip includes Automerge doc
- Importing trip rebuilds SQLite from Automerge
- Old exports still work (backward compatibility)
- All existing tests pass
- New Automerge tests have >90% coverage

---

## Data Model

### Automerge Document Structure (Per Trip)

Each **trip** is a single Automerge document:

```typescript
// Type definition
interface TripAutomergeDoc {
  id: string;
  name: string;
  emoji: string;
  currency: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;

  participants: {
    [participantId: string]: {
      id: string;
      name: string;
      color: string;
      createdAt: string;
      updatedAt: string;
    };
  };

  expenses: {
    [expenseId: string]: {
      id: string;
      description: string;
      originalAmountMinor: number;
      originalCurrency: string;
      convertedAmountMinor: number;
      fxRateToTrip: number | null;
      categoryId: string | null;
      paidById: string;
      date: string;
      createdAt: string;
      updatedAt: string;

      splits: {
        [participantId: string]: {
          shareType: 'equal' | 'percentage' | 'exact_amount' | 'shares';
          shareValue: number;
        };
      };
    };
  };

  settlements: {
    [settlementId: string]: {
      id: string;
      fromParticipantId: string;
      toParticipantId: string;
      convertedAmountMinor: number;
      date: string;
      description: string | null;
      paymentMethod: string | null;
      expenseSplitId: string | null;
      createdAt: string;
      updatedAt: string;
    };
  };

  _metadata: {
    schemaVersion: number;
    lastSyncedAt: string | null;
  };
}
```

### Storage Strategy

**Filesystem location:**
```
FileSystem.documentDirectory/automerge-docs/
  └── trip-{tripId}.automerge
```

**Persistence:**
- Use `expo-file-system` for read/write
- Store Automerge binary format (not JSON)
- One file per trip (trip-scoped isolation)

**Cache strategy:**
- SQLite remains for fast queries (indexed lookups)
- Rebuild SQLite when Automerge doc changes
- Detect desync via document hash comparison

---

## Migration Strategy

### Pre-Migration (One-Time Setup)

1. **Backup existing database**
   ```bash
   # Export all trips to JSON
   # (Use existing export functionality)
   ```

2. **Create Automerge docs from SQLite**
   ```typescript
   // Migration script (src/db/migrations/automerge-migration.ts)
   for (const trip of allTrips) {
     const doc = Automerge.from({
       ...trip,
       participants: tripParticipants,
       expenses: tripExpenses,
       settlements: tripSettlements,
     });

     await saveAutomergeDoc(trip.id, doc);
   }
   ```

3. **Verify migration**
   - Rebuild SQLite from Automerge
   - Compare with original SQLite data
   - Ensure 100% data integrity

### Dual-Write Period

During transition, all repositories write to **both** Automerge and SQLite:

```typescript
// Example: Adding an expense
async function addExpense(expense: Expense) {
  // 1. Update Automerge doc
  const doc = await loadAutomergeDoc(expense.tripId);
  const newDoc = Automerge.change(doc, 'Add expense', (d) => {
    d.expenses[expense.id] = expense;
  });
  await saveAutomergeDoc(expense.tripId, newDoc);

  // 2. Update SQLite (cache)
  await db.insert(expenses).values(expense);
}
```

### Post-Migration (SQLite as Cache)

Once stable, SQLite becomes read-only cache:

```typescript
// Read from SQLite (fast)
const expenses = await db.select().from(expenses).where(...);

// Write to Automerge only (SQLite rebuilt automatically)
const newDoc = Automerge.change(doc, 'Add expense', (d) => {
  d.expenses[expense.id] = expense;
});
await saveAutomergeDoc(tripId, newDoc);
await rebuildSQLiteCache(tripId, newDoc); // Async background task
```

---

## Testing Strategy

### Unit Tests (Engine Layer)

Test pure functions in isolation:

```typescript
// __tests__/doc-operations.test.ts
describe('addExpenseToDoc', () => {
  it('should add expense to Automerge doc', () => {
    const doc = Automerge.from({ expenses: {} });
    const expense = { id: 'e1', description: 'Lunch', amount: 1000 };

    const newDoc = addExpenseToDoc(doc, expense);

    expect(newDoc.expenses['e1']).toEqual(expense);
  });

  it('should preserve existing expenses', () => {
    const doc = Automerge.from({ expenses: { e1: { ... } } });
    const expense = { id: 'e2', description: 'Dinner', amount: 2000 };

    const newDoc = addExpenseToDoc(doc, expense);

    expect(Object.keys(newDoc.expenses)).toHaveLength(2);
  });
});
```

### Integration Tests

Test full workflows:

```typescript
// __tests__/integration.test.ts
describe('Automerge Integration', () => {
  it('should create trip, add expense, rebuild SQLite cache', async () => {
    // 1. Create Automerge doc
    const doc = await createTripDoc({ name: 'Paris Trip', currency: 'EUR' });

    // 2. Add expense
    const newDoc = Automerge.change(doc, 'Add expense', (d) => {
      d.expenses['e1'] = { ... };
    });

    // 3. Save to filesystem
    await saveAutomergeDoc('trip-1', newDoc);

    // 4. Rebuild SQLite
    await rebuildSQLiteCache('trip-1', newDoc);

    // 5. Verify SQLite matches Automerge
    const sqliteExpenses = await db.select().from(expenses);
    expect(sqliteExpenses).toHaveLength(1);
    expect(sqliteExpenses[0].description).toBe('...');
  });
});
```

### Determinism Tests

Ensure same inputs → same outputs:

```typescript
describe('Determinism', () => {
  it('should produce identical docs from same operations', () => {
    const doc1 = applyOperations(initialDoc, operations);
    const doc2 = applyOperations(initialDoc, operations);

    expect(Automerge.equals(doc1, doc2)).toBe(true);
  });
});
```

### History Parsing Tests

```typescript
describe('History Parser', () => {
  it('should parse expense addition', () => {
    const changes = Automerge.getHistory(doc);
    const parsed = parseChanges(changes);

    expect(parsed[0]).toEqual({
      type: 'expense_added',
      timestamp: expect.any(Date),
      description: 'Added expense: Lunch',
      changes: { ... }
    });
  });
});
```

---

## Rollout Plan

### Pre-Release Checklist

- [ ] All Phase 1-4 tasks completed
- [ ] Migration script tested with sample data
- [ ] Dual-write repositories implemented
- [ ] SQLite cache rebuild verified
- [ ] History UI functional
- [ ] Import/export updated
- [ ] All tests passing (>90% coverage)
- [ ] Documentation updated
- [ ] Performance benchmarked (no regressions)

### Rollout Steps

1. **Merge to `feat/automerge` branch**
2. **Internal testing** (use app with sample data)
3. **Migration dry-run** (backup, migrate, verify)
4. **Merge to `main`**
5. **Tag release** (v2.0.0 - major version bump)
6. **Monitor for issues**

### Rollback Plan

If critical issues arise:

1. **Revert to previous version** (v1.x.x)
2. **Restore SQLite from backup**
3. **Investigate Automerge issues**
4. **Fix, re-test, re-deploy**

---

## Dependencies

### Required Packages

```json
{
  "dependencies": {
    "@automerge/automerge": "^2.2.0",
    "expo-file-system": "~19.0.21" // Already installed
  }
}
```

### Optional Packages (Evaluate)

- `@automerge/automerge-repo` - Higher-level API (may simplify sync later)

---

## Future Work (Phase 2: Collaboration)

Once Automerge is integrated, adding collaboration is straightforward:

### Cloudflare Worker Relay

```typescript
// Minimal relay (Durable Object)
export class TripRelay {
  messages = [];

  async fetch(req) {
    if (req.method === 'POST') {
      // Store sync message
      this.messages.push(await req.json());
      return Response.json({ ok: true });
    }

    if (req.method === 'GET') {
      // Return unseen messages
      const since = new URL(req.url).searchParams.get('since');
      return Response.json({ messages: this.messages.filter(...) });
    }
  }
}
```

### App Changes (Minimal)

```typescript
// Add sync to existing code
const newDoc = Automerge.change(doc, 'Add expense', (d) => {
  d.expenses[expense.id] = expense;
});
await saveAutomergeDoc(tripId, newDoc);

// NEW: Send sync message
const syncMessage = Automerge.generateSyncMessage(doc, syncState);
await sendToRelay(tripId, syncMessage); // ← Only addition
```

**Collaboration comes naturally** - no rearchitecting needed.

---

## Success Metrics

### Functional Metrics

- ✅ Can create/edit/delete trips with Automerge
- ✅ History screen shows all changes
- ✅ SQLite cache rebuilds correctly
- ✅ Import/export preserves all data
- ✅ No data loss during migration

### Performance Metrics

- ✅ App startup time: <500ms (no regression)
- ✅ History screen load: <200ms for 100 changes
- ✅ SQLite cache rebuild: <1s for typical trip (50 expenses)

### Quality Metrics

- ✅ Test coverage: >90% for new code
- ✅ No critical bugs in production
- ✅ Architecture validation passes (`npm run arch-test`)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Migration data loss | Low | High | Comprehensive testing, backups |
| Performance regression | Medium | Medium | Benchmark before/after, optimize cache |
| Automerge bugs | Low | Medium | Use stable version, test thoroughly |
| Complex debugging | Medium | Low | Extensive logging, deterministic tests |

---

## References

- [Automerge Documentation](https://automerge.org/)
- [Architecture Guidelines](../wiki/Architecture-Guidelines.md)
- [Settlement Module](../../src/modules/settlements) - Gold standard
- [CLAUDE.md](../../CLAUDE.md) - Project instructions

---

**Last Updated:** 2025-12-29
**Author:** Claude Sonnet 4.5
**Status:** Ready for Implementation
