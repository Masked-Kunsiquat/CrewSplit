/**
 * LOCAL DATA ENGINEER: Trip Repository Adapter for Expense Service
 *
 * Adapter that wraps trip repository calls for expense service use.
 * Only exposes minimal interface needed by expense service.
 */

import { db } from "@db/client";
import { trips as tripsTable } from "@db/schema/trips";
import { eq } from "drizzle-orm";
import type { ITripRepository } from "../service/types";

export class TripRepositoryAdapter implements ITripRepository {
  async getById(
    id: string,
  ): Promise<{ id: string; currencyCode: string } | null> {
    const rows = await db
      .select({ id: tripsTable.id, currencyCode: tripsTable.currencyCode })
      .from(tripsTable)
      .where(eq(tripsTable.id, id))
      .limit(1);

    return rows.length > 0 ? rows[0] : null;
  }
}

/**
 * Singleton instance for use in production code
 */
export const tripRepositoryAdapter = new TripRepositoryAdapter();
