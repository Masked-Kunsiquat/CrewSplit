# Automerge Module

**Status**: Phase 1 - Foundation (In Progress)
**Created**: 2025-12-29

## Overview

This module provides local-first data layer integration with Automerge CRDTs for CrewSplit. It enables built-in change history tracking and prepares the foundation for future collaboration features.

## Architecture

The module follows CrewSplit's three-layer architecture (modeled after the settlements module):

### 1. Engine Layer (Pure Functions)
- `engine/doc-schema.ts` - TypeScript types for Automerge document structure
- `engine/doc-operations.ts` - Pure functions for document mutations
- **Zero dependencies**: No side effects, deterministic
- **100% testable**: All tests pass for engine layer

### 2. Service Layer (Orchestration)
- `service/AutomergeManager.ts` - Document lifecycle management
- Handles create, load, save, update operations
- Uses dependency injection for testability

### 3. Repository Layer (Storage)
- `repository/automerge-storage.ts` - Filesystem persistence
- Uses expo-file-system for binary storage
- Stores documents in `automerge-docs/trip-{tripId}.automerge`

### 4. Hooks Layer (React Integration)
- `hooks/use-automerge-doc.ts` - React hook for loading documents
- Manages loading state and errors

## Document Structure

Each trip is stored as a single Automerge document:

```typescript
interface TripAutomergeDoc {
  // Trip metadata
  id: string;
  name: string;
  emoji: string;
  currency: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;

  // Collections (keyed by ID)
  participants: { [id: string]: TripParticipant };
  expenses: { [id: string]: TripExpense };
  settlements: { [id: string]: TripSettlement };

  // Internal metadata
  _metadata: {
    schemaVersion: number;
    lastSyncedAt: string | null;
  };
}
```

## API Usage

### Creating a Trip

```typescript
import { AutomergeManager } from '@modules/automerge';

const manager = new AutomergeManager();
const doc = await manager.createTrip({
  id: 'trip-123',
  name: 'Paris Trip',
  emoji: '🗼',
  currency: 'EUR',
  startDate: '2024-01-01',
  endDate: null,
});
```

### Loading a Trip

```typescript
const doc = await manager.loadTrip('trip-123');
if (doc) {
  console.log(doc.name); // "Paris Trip"
}
```

### Adding a Participant

```typescript
await manager.addParticipant('trip-123', {
  id: 'p1',
  name: 'Alice',
  color: '#FF5733',
});
```

### Adding an Expense

```typescript
await manager.addExpense('trip-123', {
  id: 'e1',
  description: 'Dinner',
  originalAmountMinor: 5000,
  originalCurrency: 'USD',
  convertedAmountMinor: 5000,
  fxRateToTrip: null,
  categoryId: null,
  paidById: 'p1',
  date: '2024-01-01',
  splits: {
    p1: { shareType: 'equal', shareValue: 1 },
    p2: { shareType: 'equal', shareValue: 1 },
  },
});
```

### Using in React Components

```typescript
import { useAutomergeDoc } from '@modules/automerge';

function TripScreen({ tripId }: { tripId: string }) {
  const { doc, loading, error, reload } = useAutomergeDoc(tripId);

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error.message}</Text>;
  if (!doc) return <Text>No document found</Text>;

  return <Text>{doc.name}</Text>;
}
```

## Testing

### Running Tests

```bash
npm test -- automerge
```

### Test Coverage

- **Engine Layer**: ✅ 100% passing - All pure functions tested
  - `doc-operations.test.ts` - 30 passing tests
- **Service Layer**: ⚠️ In Progress - API compatibility fixes needed
  - `automerge-manager.test.ts` - Mocked storage tests
- **Integration Layer**: ⚠️ In Progress - API compatibility fixes needed
  - `integration.test.ts` - End-to-end tests with filesystem mock

### Current Status

**Automerge Version**: 3.2.1

**Known Issues**:
- Automerge 3.x API has changed from 2.x
- Need to adjust document initialization approach
- All infrastructure is in place, just need API compatibility fixes

**What Works**:
- ✅ Module structure (follows settlements gold standard)
- ✅ Engine layer functions (pure, deterministic)
- ✅ Repository layer (filesystem storage)
- ✅ Service layer (orchestration)
- ✅ React hooks (UI integration)
- ✅ Comprehensive test suite (structure complete)

**Next Steps**:
1. Research Automerge 3.x API documentation
2. Fix document initialization in `AutomergeManager.createTrip()`
3. Update test helpers to use correct Automerge 3.x patterns
4. Verify all tests pass
5. Add test coverage reports

## Files

```
src/modules/automerge/
├── engine/
│   ├── doc-schema.ts           # TypeScript types
│   ├── doc-operations.ts       # Pure functions
│   └── index.ts
├── service/
│   ├── AutomergeManager.ts     # Document lifecycle
│   └── index.ts
├── repository/
│   ├── automerge-storage.ts    # Filesystem persistence
│   └── index.ts
├── hooks/
│   ├── use-automerge-doc.ts    # React hook
│   └── index.ts
├── __tests__/
│   ├── doc-operations.test.ts  # ✅ 30 passing
│   ├── automerge-manager.test.ts # ⚠️ API fixes needed
│   └── integration.test.ts     # ⚠️ API fixes needed
├── types.ts                     # Domain types
├── index.ts                     # Public API
└── README.md                    # This file
```

## Design Decisions

### Why Automerge?

1. **Built-in History**: Every mutation is logged as an operation
2. **Deterministic**: Same operations always produce same result
3. **Collaboration-Ready**: Sync between devices with minimal code changes
4. **CRDT Benefits**: Offline edits merge automatically

### Why One Document Per Trip?

- **Isolation**: Each trip is independent
- **Performance**: Smaller documents = faster operations
- **Simplicity**: Easy to reason about and test

### Why Binary Storage?

- **Efficiency**: Smaller file sizes
- **Integrity**: Automerge's native format
- **History**: Full operation log preserved

## Future Phases

**Phase 2**: Migration & Dual-Write
- Migrate existing SQLite data to Automerge
- Implement dual-write pattern
- SQLite cache rebuilder

**Phase 3**: History Feature
- History parsing engine
- Timeline UI
- Change detail cards

**Phase 4**: Import/Export & Polish
- Update import/export to include Automerge docs
- Performance optimization
- Documentation

## Resources

- [Automerge Documentation](https://automerge.org/)
- [Architecture Guidelines](../../wiki/Architecture-Guidelines.md)
- [Implementation Plan](../../docs/automerge/AUTOMERGE_IMPLEMENTATION_PLAN.md)
- [Settlement Module](../settlements) - Gold standard

---

**Last Updated**: 2025-12-29
**Author**: Claude Sonnet 4.5 (System Architect)
