This document outlines the next five implementation steps for the CrewSplit project, building upon the current codebase. Each step is atomic and should be applied in order. The steps assume Steps 1–4 (project structure, schema definition, math engine, and UI scaffolding) are already complete.

Step 5 – Migration Infrastructure

Role: Local Data Engineer

Implement a robust migration system to evolve the database schema without resetting user data. This is mandatory before adding or modifying schema columns.

Configure Drizzle Kit: Ensure drizzle.config.ts is pointed at src/db/schema with driver: "expo" and out: "./src/db/migrations".

Generate migrations: Run npx drizzle-kit generate:sqlite to create SQL migration files for existing schema (including multi‑currency columns already in trips and expenses
github.com
github.com
). Commit these .sql files under src/db/migrations.

Bundle migrations in Expo: Update metro.config.js to add 'sql' to assetExts so .sql files are packaged with the app.

Add migration hook: In src/db/client.ts, import useMigrations from drizzle-orm/expo-sqlite/migrator and the generated migrations. Export a useDbMigrations() hook that calls useMigrations(db, migrations) and returns { success, error }. Remove the current destructive reset logic (dropping tables when schema version mismatches
github.com
).

Gate application startup: In app/_layout.tsx, replace initializeDatabase() with the useDbMigrations() hook. Block rendering until migrations succeed. Show a loading screen during migration and an error screen if migrations fail.

Update documentation: Document how to generate and apply migrations in src/db/migrations/README.md and update any references to the destructive reset.

Step 6 – Data Layer (Repositories and Hooks)

Role: Local Data Engineer

With migrations in place, implement the database access layer to fetch and persist data. Use Drizzle ORM and ensure multi‑currency logic is enforced at this layer.

Schema confirmation: Ensure the existing schema files reflect the multi‑currency fields. The trips table already has currency and currencyCode columns
github.com
, and the expenses table stores originalCurrency, originalAmountMinor, fxRateToTrip, and convertedAmountMinor
github.com
.

Create repository modules under src/modules/<domain>/repository/:

TripRepository: createTrip, getTrips, getTripById, updateTrip, deleteTrip.

ParticipantRepository: addParticipant, getParticipantsForTrip, removeParticipant.

ExpenseRepository: addExpense (handles multi‑currency: if originalCurrency matches the trip currency, set fxRateToTrip = 1.0 and convertedAmountMinor = originalAmountMinor; otherwise require fxRateToTrip), getExpensesForTrip, getExpenseById, updateExpense, deleteExpense.

ExpenseSplitRepository: setExpenseSplits and getSplitsForExpense; unchanged logic, but returns splits keyed to convertedAmountMinor.

Add DB mappers (src/db/mappers/) to convert between Drizzle row formats and domain models, preserving currency fields and minor/major unit distinctions.

Implement transactions: When creating an expense with splits, wrap the inserts in a transaction: insert into expenses then into expense_splits to ensure atomic writes.

Create typed hooks in src/modules/*/hooks/ for data access:

useTrips(), useParticipants(tripId), useExpenses(tripId), useAddExpense(), etc. These hooks should use Zustand or React Query to manage loading and error state but no business logic (e.g., no settlement math or currency conversion).

Return typed objects: Repositories and hooks must return strongly typed data consistent with schema definitions to ease downstream consumption.

Step 7 – Settlement Integration

Role: Settlement Integration Engineer

Hook the pure settlement algorithms up to the data layer so the app can compute who owes whom for a trip.

Create SettlementService under src/modules/settlement/service/SettlementService.ts with these responsibilities:

Load all expenses and expense splits for a trip via repositories.

Operate exclusively on convertedAmountMinor in the trip currency (never on originalAmountMinor or any user display currency).

Call the pure functions normalizeShares, calculateBalances, and optimizeSettlements from the settlement module to compute balances and settlement transactions.

Return an object containing the trip currency, totals per participant (paid, owed, net), and a list of settlements.

Add a useSettlement(tripId) hook in src/modules/settlement/hooks/ that fetches expenses/splits, calls SettlementService, and returns settlement data. This hook should not perform currency conversions or UI formatting.

Ensure determinism: The integration must preserve the deterministic behavior and purity of the settlement algorithms. Do not add randomness or side effects.

Step 8 – Display Currency Adapter

Role: Display Integration Engineer

Allow users to view amounts in their preferred currency without affecting calculations.

Create DisplayCurrencyAdapter under src/modules/settlement/service/DisplayCurrencyAdapter.ts with the following behavior:

Accept settlement results (trip currency amounts) and the user’s preferred display currency.

Convert amounts from the trip currency to the display currency using a provided FX rate (this can initially be stubbed or manually entered; actual FX fetching is out of scope for this step).

Return both the trip-currency amount and the display-currency equivalent, clearly labelled. Never modify the underlying settlement data used by the math engine.

Extend useSettlement to optionally return display currency equivalents alongside raw settlement data. This should not slow down or complicate the original hook.

No side effects: Keep display conversions purely visual; never write converted values back to the database.

Step 9 – Settlement UI Integration

Role: UI/UX Engineer

Tie everything together in the user interface so participants can see balances and suggested payments.

Connect Settlement Summary Screen: Update SettlementSummaryScreen to consume useSettlement(tripId) and display:

Balances per participant (total paid, total owed, net) in the trip currency with optional display currency equivalents.

Suggested payment transactions (from → to with amount) using the settlement results.

Loading and error states while data is fetched and settlements calculated.

Enhance Expense Details Screen: Show the original amount with original currency, the converted amount in the trip currency, and the display currency equivalent if enabled.

Add Display Currency Settings: Provide a settings UI (e.g., in a profile or settings screen) where users can select their preferred display currency. Persist this preference locally (e.g., via AsyncStorage) but do not use it in settlement calculations.

Ensure theming consistency: Use existing theme tokens for spacing, colors, and typography; maintain dark‑mode‑first design and accessible contrast. Follow the UI scaffolding guidelines (loading spinners, error messages, etc.).

Do not implement further sync or export features in this step; those belong to future phases or other agents.

Once these steps are completed, CrewSplit will have a fully functional data layer with migration support, deterministic settlement calculations integrated with the database, user‑friendly display currency conversions, and UI screens that reflect real data.
