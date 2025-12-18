/**
 * LOCAL DATA ENGINEER: Settlements Schema
 * Records payments made between participants to settle debts
 *
 * DESIGN PRINCIPLES:
 * 1. Single Source of Truth: Settlement transactions are SEPARATE from expense splits
 * 2. Deterministic Recalculation: Net balances = (expenses - settlements)
 * 3. Multi-currency Support: Settlements can be in any currency with FX conversion
 * 4. Flexible Payments: ANY amount between ANY participants (not restricted to calculated settlements)
 *
 * CONCEPTUAL MODEL:
 * - ExpenseSplits define "what you owe" (from shared expenses)
 * - Settlements define "what you've paid back"
 * - Net balance = totalOwed (from splits) - totalSettled (from settlements)
 *
 * TRANSACTION TYPES:
 * 1. General payment: User pays another user any amount (reduces net debt)
 * 2. Expense-specific: User pays off a specific expense split (links to expenseSplitId)
 *    - Example: "I'm paying my share of the dinner bill"
 *    - Allows granular tracking of which expenses are settled
 */

import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { trips } from "./trips";
import { participants } from "./participants";
import { expenseSplits } from "./expense-splits";

/**
 * SETTLEMENTS TABLE
 * Represents a payment from one participant to another to settle debt
 *
 * IMPORTANT: Amounts stored as INTEGER in cents to avoid floating-point errors
 * IMPORTANT: Multi-currency pattern matches expenses.ts (original + converted amounts)
 */
export const settlements = sqliteTable(
  "settlements",
  {
    // UUID primary key
    id: text("id").primaryKey(),

    // Foreign key to trips table (CASCADE on delete)
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),

    /**
     * Payment direction: from → to
     * - from: Participant who is paying (debtor)
     * - to: Participant receiving payment (creditor)
     *
     * IMPORTANT: RESTRICT on delete - cannot delete participants with settlements
     * This preserves audit trail even if someone tries to remove a participant
     */
    fromParticipantId: text("from_participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "restrict" }),

    toParticipantId: text("to_participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "restrict" }),

    /**
     * Optional link to specific expense split being paid off
     * - NULL: General payment (not tied to specific expense)
     * - NOT NULL: Paying off this specific expense split
     *
     * RESTRICT on delete: Cannot delete expense split if settlement references it
     * This preserves the record of what was settled
     *
     * USE CASE: User says "I'm paying my share of the dinner bill"
     * - System finds the expense split for that user on that expense
     * - Links settlement to that split
     * - UI can show "Paid: Dinner split" instead of just generic payment
     */
    expenseSplitId: text("expense_split_id").references(() => expenseSplits.id, {
      onDelete: "restrict",
    }),

    /**
     * Multi-currency support (same pattern as expenses.ts)
     *
     * - originalCurrency: Currency as entered by user (e.g., "EUR")
     * - originalAmountMinor: Amount in cents in original currency (e.g., 5000 = €50.00)
     * - fxRateToTrip: Exchange rate to convert to trip currency (NULL if same currency)
     * - convertedAmountMinor: Amount in cents in trip currency (always set)
     *
     * EXAMPLE: Trip in USD, user pays €50 to settle debt
     * - originalCurrency: "EUR"
     * - originalAmountMinor: 5000 (€50.00)
     * - fxRateToTrip: 1.08 (1 EUR = 1.08 USD)
     * - convertedAmountMinor: 5400 (round(5000 * 1.08) = $54.00)
     *
     * SETTLEMENT CALCULATIONS: Always use convertedAmountMinor (trip currency)
     */
    originalCurrency: text("original_currency").notNull(),
    originalAmountMinor: integer("original_amount_minor").notNull(),
    fxRateToTrip: real("fx_rate_to_trip"), // NULL when originalCurrency matches trip currency
    convertedAmountMinor: integer("converted_amount_minor").notNull(),

    /**
     * Settlement date (ISO 8601 string)
     * - User-entered date when payment occurred
     * - Defaults to current date
     * - Allows backdating: "I paid this last week"
     *
     * IMPORTANT: This is payment date, not creation timestamp
     */
    date: text("date").notNull(),

    /**
     * Optional description/notes
     * - "Paid back for dinner"
     * - "Venmo payment for groceries"
     * - "Cash payment"
     *
     * UI should suggest descriptions based on linked expense split
     */
    description: text("description"),

    /**
     * Payment method (optional, for user reference)
     * - 'cash', 'venmo', 'paypal', 'bank_transfer', 'other'
     * - Purely informational, doesn't affect calculations
     */
    paymentMethod: text("payment_method"), // 'cash' | 'venmo' | 'paypal' | 'bank_transfer' | 'other'

    // Timestamps (when record was created/modified, NOT payment date)
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    // Index for trip-based queries (most common: show all settlements for a trip)
    tripIdIdx: index("settlements_trip_id_idx").on(table.tripId),

    // Index for participant-based queries (show settlements from/to specific person)
    fromParticipantIdx: index("settlements_from_participant_idx").on(
      table.fromParticipantId,
    ),
    toParticipantIdx: index("settlements_to_participant_idx").on(
      table.toParticipantId,
    ),

    // Index for expense split linkage (find settlements for specific expense)
    expenseSplitIdx: index("settlements_expense_split_idx").on(
      table.expenseSplitId,
    ),

    // Index for date-based queries (chronological view)
    dateIdx: index("settlements_date_idx").on(table.date),
  }),
);

// Export type inference for TypeScript
export type Settlement = typeof settlements.$inferSelect;
export type NewSettlement = typeof settlements.$inferInsert;
