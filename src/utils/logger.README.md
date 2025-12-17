# Logger Utility

Centralized logging system with consistent formatting, PII safety, and environment-aware filtering.

## Features

- **Consistent Formatting**: All logs include emoji + context prefix
- **PII Redaction**: Automatically redacts names and descriptions in production
- **Environment-Aware**: Different log levels for dev vs production
- **Contextual Loggers**: Pre-configured loggers for each module
- **Type-Safe**: Full TypeScript support with context types

## Usage

### Basic Usage

```typescript
import { logger } from "@utils/logger";

// Manual context specification
logger.info("db", "Connection established");
logger.warn("expense", "Missing category", { expenseId: "123" });
logger.error("trip", "Failed to create trip", error);
```

### Contextual Loggers (Recommended)

Use pre-configured contextual loggers to avoid repeating context:

```typescript
import { migrationLogger, expenseLogger, tripLogger } from "@utils/logger";

// Database migrations
migrationLogger.info("Applying migration 0001");
migrationLogger.error("Migration failed", error);

// Expense operations
expenseLogger.debug("Calculating splits", { expenseId, participants });
expenseLogger.warn("Invalid split configuration", { expenseId });

// Trip operations
tripLogger.info("Creating trip", { tripId, name: "Summer Vacation" });
```

## Available Contexts

Each context has a dedicated emoji for visual scanning:

| Context       | Emoji | Import              | Use For                    |
| ------------- | ----- | ------------------- | -------------------------- |
| `db`          | 💾    | `dbLogger`          | Database operations        |
| `migration`   | 🔄    | `migrationLogger`   | Schema migrations          |
| `storage`     | 📦    | `storageLogger`     | AsyncStorage operations    |
| `settlement`  | 💰    | `settlementLogger`  | Settlement calculations    |
| `expense`     | 💸    | `expenseLogger`     | Expense CRUD operations    |
| `trip`        | ✈️    | `tripLogger`        | Trip CRUD operations       |
| `participant` | 👤    | `participantLogger` | Participant operations     |
| `currency`    | 💱    | `currencyLogger`    | Currency conversions       |
| `ui`          | 🎨    | `uiLogger`          | UI events and interactions |
| `dev`         | 🔧    | `devLogger`         | Development/debugging      |

## Log Levels

```typescript
logger.debug("context", "Detailed debugging info"); // Only in dev with enableDebug
logger.info("context", "General informational message"); // Dev + production (if configured)
logger.warn("context", "Warning message"); // Always shown
logger.error("context", "Error message", error); // Always shown
```

### Environment Behavior

**Development (`__DEV__ === true`):**

- All log levels shown (except debug if `enableDebug: false`)
- Full data displayed (no PII redaction)
- Useful for debugging

**Production (`__DEV__ === false`):**

- Only `warn` and `error` shown by default
- Names and descriptions automatically redacted
- IDs truncated to first 8 characters

## PII Redaction

In production, sensitive data is automatically redacted:

```typescript
// Development output:
tripLogger.info("Trip created", {
  id: "abc123def456",
  name: "Vegas Trip",
  description: "Bachelor party",
  startDate: "2024-01-01",
});
// 💾 [TRIP] Trip created
// {
//   "id": "abc123def456",
//   "name": "Vegas Trip",
//   "description": "Bachelor party",
//   "startDate": "2024-01-01"
// }

// Production output (same call):
// 💾 [TRIP] Trip created
// {
//   "id": "abc123de...",
//   "name": "[REDACTED]",
//   "description": "[REDACTED]",
//   "startDate": "2024-01-01"
// }
```

**Redacted fields:**

- `name`, `Name`, `*name*` → `[REDACTED]`
- `description`, `Description`, `*description*` → `[REDACTED]`
- `id`, `*Id` → Truncated to 8 chars (e.g., `abc123de...`)

**Preserved fields:**

- Dates, amounts, currencies
- Booleans, numbers
- Arrays and nested objects (with recursive redaction)

## Examples

### Database Operations

```typescript
import { dbLogger } from "@utils/logger";

dbLogger.info("Opening database connection");
dbLogger.debug("Executing query", { sql: "SELECT * FROM trips" });
dbLogger.error("Query failed", error);
```

### Settlement Calculations

```typescript
import { settlementLogger } from "@utils/logger";

settlementLogger.debug("Calculating balances", { tripId, participantCount: 5 });
settlementLogger.info("Settlement calculated", {
  settlements: 3,
  totalAmount: 50000,
});
```

### Storage Operations

```typescript
import { storageLogger } from "@utils/logger";

try {
  await AsyncStorage.setItem(key, value);
  storageLogger.info("Saved display currency", { currency: "USD" });
} catch (error) {
  storageLogger.error("Failed to save", error);
}
```

## Custom Logger Configuration

For advanced use cases, create a custom logger instance:

```typescript
import { Logger } from "@utils/logger";

const customLogger = new Logger({
  enableDebug: false, // Disable debug even in dev
  minProductionLevel: "error", // Only errors in production
  redactPII: true, // Force PII redaction even in dev
});

customLogger.info("custom", "This is a custom logger");
```

## Migration from console.log

**Before:**

```typescript
console.log("✅ Database migrations applied successfully");
console.error("❌ Migration failed:", error);
console.warn("Missing participant data");
```

**After:**

```typescript
import { migrationLogger } from "@utils/logger";

migrationLogger.info("Database migrations applied successfully");
migrationLogger.error("Migration failed", error);
migrationLogger.warn("Missing participant data");
```

## Best Practices

1. **Use contextual loggers** instead of specifying context manually
2. **Log errors with error objects** for stack traces: `logger.error('context', 'msg', error)`
3. **Avoid logging in pure functions** (settlement math, normalizers)
4. **Use debug level** for verbose/noisy logs
5. **Include relevant IDs** in log data for debugging
6. **Don't log sensitive user content** that shouldn't be redacted (e.g., passwords, tokens)

## Performance

- Logs are filtered at the logger level (no string formatting if filtered)
- Zero overhead in production for debug/info logs (configured by default)
- JSON.stringify only called when log will be displayed
