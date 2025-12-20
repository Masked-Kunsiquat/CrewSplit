// Responsible agent: LOCAL DATA ENGINEER
import { db } from "@db/client";
import { trips } from "@db/schema/trips";
import { participants } from "@db/schema/participants";
import { expenses } from "@db/schema/expenses";
import { expenseSplits } from "@db/schema/expense-splits";
import { settlements } from "@db/schema/settlements";
import { expenseCategories } from "@db/schema/expense-categories";
import { eq } from "drizzle-orm";
import type { SampleDataTemplateId } from "../types";

interface SampleDataTemplate {
  trip: any;
  participants?: any[];
  expenses?: any[];
  expenseSplits?: any[];
  settlements?: any[];
  categories?: any[];
}

const sampleDataTemplates: Record<SampleDataTemplateId, SampleDataTemplate> = {
  summer_road_trip: require("../../../../sample-data/crewledger-summer-road-trip-2025-12-18.json"),
  family_beach_vacation: require("../../../../sample-data/crewledger-family-beach-vacation-2025-12-19.json"),
  weekend_ski_trip: require("../../../../sample-data/crewledger-weekend-ski-trip-2025-12-18.json"),
  europe_backpacking: require("../../../../sample-data/crewledger-europe-backpacking-2025-12-18.json"),
};

export class SampleDataService {
  async loadSampleTrip(templateId: SampleDataTemplateId): Promise<string> {
    const sampleData = sampleDataTemplates[templateId];
    if (!sampleData) {
      throw new Error(`Unknown sample template: ${templateId}`);
    }

    const {
      trip,
      participants: participantData,
      expenses: expenseData,
      expenseSplits: splitData,
      settlements: settlementData,
      categories: categoryData,
    } = sampleData;

    const tripId = trip.id;

    // CRITICAL: Check if categories exist BEFORE transaction
    const categoriesBeforeTx = await db.select().from(expenseCategories);
    console.log(`Categories BEFORE transaction: ${categoriesBeforeTx.length}`, categoriesBeforeTx.map(c => c.id));

    const normalizedSettlements = settlementData?.map((settlement: any) => {
      if ("originalCurrency" in settlement) {
        return settlement;
      }

      const originalCurrency =
        settlement.currency ?? trip.currency ?? trip.currencyCode ?? "USD";
      const originalAmountMinor =
        settlement.originalAmountMinor ?? settlement.amountMinor;

      if (typeof originalAmountMinor !== "number") {
        throw new Error(
          `Invalid settlement amount for ${settlement.id ?? "unknown"}`,
        );
      }

      const date =
        settlement.date ?? settlement.createdAt ?? settlement.updatedAt;
      const resolvedDate = date ?? new Date().toISOString();

      return {
        id: settlement.id,
        tripId: settlement.tripId ?? tripId,
        fromParticipantId: settlement.fromParticipantId,
        toParticipantId: settlement.toParticipantId,
        expenseSplitId: settlement.expenseSplitId ?? null,
        originalCurrency,
        originalAmountMinor,
        fxRateToTrip: settlement.fxRateToTrip ?? null,
        convertedAmountMinor:
          settlement.convertedAmountMinor ?? originalAmountMinor,
        date: resolvedDate,
        description: settlement.description ?? null,
        paymentMethod: settlement.paymentMethod ?? null,
        createdAt: settlement.createdAt ?? resolvedDate,
        updatedAt: settlement.updatedAt ?? resolvedDate,
      };
    });

    try {
      await db.transaction(async (tx) => {
        // Clear any existing sample data for this template
        await tx
          .delete(trips)
          .where(eq(trips.sampleDataTemplateId, templateId));
        // Note: CASCADE should handle related data, but if not, you'd delete them manually.
        // For example:
        // await tx.delete(participants).where(inArray(participants.tripId, ...));

        // Insert new sample data
        console.log("Inserting trip...");
        await tx.insert(trips).values({
          ...trip,
          isSampleData: true,
          sampleDataTemplateId: templateId,
        });

        // Insert categories only if they're trip-specific (not system categories)
        // System categories are already seeded in migration
        if (categoryData?.length) {
          const tripSpecificCategories = categoryData.filter(
            (cat: any) => !cat.isSystem && cat.tripId === tripId,
          );
          console.log(`Inserting ${tripSpecificCategories.length} trip-specific categories...`);
          if (tripSpecificCategories.length > 0) {
            await tx.insert(expenseCategories).values(tripSpecificCategories);
          }
        }

        console.log(`Inserting ${participantData?.length || 0} participants...`);
        if (participantData?.length) {
          await tx.insert(participants).values(participantData);
        }

        // Verify categories exist before inserting expenses
        const existingCategories = await tx.select().from(expenseCategories);
        console.log(`Existing categories in DB: ${existingCategories.length}`, existingCategories.map(c => c.id));

        console.log(`Inserting ${expenseData?.length || 0} expenses...`);
        if (expenseData?.length) {
          // Log first expense to debug
          console.log('First expense:', JSON.stringify(expenseData[0], null, 2));
          await tx.insert(expenses).values(expenseData);
        }

        console.log(`Inserting ${splitData?.length || 0} expense splits...`);
        if (splitData?.length) {
          await tx.insert(expenseSplits).values(splitData);
        }

        console.log(`Inserting ${normalizedSettlements?.length || 0} settlements...`);
        if (normalizedSettlements?.length) {
          await tx.insert(settlements).values(normalizedSettlements);
        }

        console.log("Sample data inserted successfully!");
      });
    } catch (err) {
      // Provide helpful error message if database schema is outdated
      if (err instanceof Error && err.message.includes("no such column")) {
        const columnMatch = err.message.match(/no such column: (\S+)/);
        const missingColumn = columnMatch ? columnMatch[1] : "unknown";
        throw new Error(
          `Database schema is outdated (missing column: ${missingColumn}). Please restart the app to apply schema updates.`,
        );
      }
      throw err;
    }

    return tripId;
  }

  getAvailableTemplates(): SampleDataTemplateId[] {
    return Object.keys(sampleDataTemplates) as SampleDataTemplateId[];
  }
}

export const sampleDataService = new SampleDataService();
