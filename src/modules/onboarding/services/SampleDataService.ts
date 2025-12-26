// Responsible agent: LOCAL DATA ENGINEER
import { db } from "@db/client";
import { trips } from "@db/schema/trips";
import { participants } from "@db/schema/participants";
import { expenses } from "@db/schema/expenses";
import { expenseSplits } from "@db/schema/expense-splits";
import { settlements } from "@db/schema/settlements";
import { expenseCategories } from "@db/schema/expense-categories";
import { eq } from "drizzle-orm";
import { createAppError } from "@utils/errors";
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
      throw createAppError(
        "INVALID_INPUT",
        `Unknown sample template: ${templateId}`,
        { details: { templateId } },
      );
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

    const normalizedSettlements = settlementData?.map((settlement: any) => {
      if ("originalCurrency" in settlement) {
        return settlement;
      }

      const originalCurrency =
        settlement.currency ?? trip.currency ?? trip.currencyCode ?? "USD";
      const originalAmountMinor =
        settlement.originalAmountMinor ?? settlement.amountMinor;

      if (typeof originalAmountMinor !== "number") {
        throw createAppError(
          "INVALID_INPUT",
          `Invalid settlement amount for ${settlement.id ?? "unknown"}`,
          { details: { settlementId: settlement.id } },
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
        await tx.insert(trips).values({
          ...trip,
          isSampleData: true,
          sampleDataTemplateId: templateId,
        });

        // Insert categories only if they're trip-specific (not system categories)
        // System categories are already seeded programmatically
        if (categoryData?.length) {
          const tripSpecificCategories = categoryData.filter(
            (cat: any) => !cat.isSystem && cat.tripId === tripId,
          );
          if (tripSpecificCategories.length > 0) {
            await tx.insert(expenseCategories).values(tripSpecificCategories);
          }
        }

        if (participantData?.length) {
          await tx.insert(participants).values(participantData);
        }

        if (expenseData?.length) {
          await tx.insert(expenses).values(expenseData);
        }

        if (splitData?.length) {
          await tx.insert(expenseSplits).values(splitData);
        }

        if (normalizedSettlements?.length) {
          await tx.insert(settlements).values(normalizedSettlements);
        }
      });
    } catch (err) {
      // Provide helpful error message if database schema is outdated
      if (err instanceof Error && err.message.includes("no such column")) {
        const columnMatch = err.message.match(/no such column: (\S+)/);
        const missingColumn = columnMatch ? columnMatch[1] : "unknown";
        throw createAppError(
          "OPERATION_FAILED",
          `Database schema is outdated (missing column: ${missingColumn}). Please restart the app to apply schema updates.`,
          { details: { missingColumn } },
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
