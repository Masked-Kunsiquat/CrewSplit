import { db } from "@db/client";
import { trips } from "@db/schema/trips";
import { participants } from "@db/schema/participants";
import { expenses } from "@db/schema/expenses";
import { expenseSplits } from "@db/schema/expense-splits";
import { settlements } from "@db/schema/settlements";
import { eq } from "drizzle-orm";

// This is a simplified way to get the sample data.
// In a real app, you might use a different mechanism to load files.
const sampleData = require("../../../../scripts/crewledger-summer-road-trip-2025-12-18.json");

export class SampleDataService {
  async loadSampleTrip(templateId: string): Promise<string> {
    const {
      trip,
      participants: participantData,
      expenses: expenseData,
      expenseSplits: splitData,
      settlements: settlementData,
    } = sampleData;

    const tripId = trip.id;

    await db.transaction(async (tx) => {
      // Clear any existing sample data for this template
      await tx
        .delete(trips)
        .where(eq(trips.sampleDataTemplateId, templateId));
      // Note: CASCADE should handle related data, but if not, you'd delete them manually.
      // For example:
      // await tx.delete(participants).where(inArray(participants.tripId, ...));

      // Insert new sample data
      await tx.insert(trips).values({
        ...trip,
        isSampleData: true,
        sampleDataTemplateId: templateId,
      });
      if (participantData?.length) {
        await tx.insert(participants).values(participantData);
      }
      if (expenseData?.length) {
        await tx.insert(expenses).values(expenseData);
      }
      if (splitData?.length) {
        await tx.insert(expenseSplits).values(splitData);
      }
      if (settlementData?.length) {
        await tx.insert(settlements).values(settlementData);
      }
    });

    return tripId;
  }
}
