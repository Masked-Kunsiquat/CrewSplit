import { db } from "@db/client";
import { userSettings } from "@db/schema/user-settings";
import { onboardingState } from "@db/schema/onboarding-state";
import { trips } from "@db/schema/trips";
import { and, eq } from "drizzle-orm";
import {
  OnboardingState,
  UserSettings,
  OnboardingFlowId,
  OnboardingStepId,
} from "../types";

export class OnboardingRepository {
  async getUserSettings(): Promise<UserSettings> {
    return db.transaction(async (tx) => {
      const settings = await tx
        .select()
        .from(userSettings)
        .where(eq(userSettings.id, "default"))
        .get();
      if (settings) {
        return settings;
      }

      const newSettings: UserSettings = {
        id: "default",
        primaryUserName: null,
        defaultCurrency: "USD",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await tx.insert(userSettings).values(newSettings);
      return newSettings;
    });
  }

  async updateUserSettings(
    update: Partial<UserSettings>,
  ): Promise<UserSettings> {
    return db.transaction(async (tx) => {
      const now = new Date().toISOString();
      const current = await tx
        .select()
        .from(userSettings)
        .where(eq(userSettings.id, "default"))
        .get();

      if (current) {
        await tx
          .update(userSettings)
          .set({ ...update, updatedAt: now })
          .where(eq(userSettings.id, "default"));
        return {
          ...current,
          ...update,
          updatedAt: now,
        } as UserSettings;
      }

      const newSettings: UserSettings = {
        id: "default",
        primaryUserName: null,
        defaultCurrency: "USD",
        createdAt: now,
        updatedAt: now,
        ...update,
      };
      await tx.insert(userSettings).values(newSettings);
      return newSettings;
    });
  }

  async getOnboardingState(
    flowId: OnboardingFlowId,
  ): Promise<OnboardingState | null> {
    return (
      db
        .select()
        .from(onboardingState)
        .where(eq(onboardingState.id, flowId))
        .get() ?? null
    );
  }

  async markStepCompleted(
    flowId: OnboardingFlowId,
    stepId: OnboardingStepId,
  ): Promise<OnboardingState> {
    return db.transaction(async (tx) => {
      const now = new Date().toISOString();
      const state = await tx
        .select()
        .from(onboardingState)
        .where(eq(onboardingState.id, flowId))
        .get();

      if (state) {
        const completedSteps = [...(state.completedSteps || []), stepId];
        await tx
          .update(onboardingState)
          .set({
            completedSteps: completedSteps,
            updatedAt: now,
          })
          .where(eq(onboardingState.id, flowId));
      } else {
        await tx.insert(onboardingState).values({
          id: flowId,
          isCompleted: false,
          completedSteps: [stepId],
          createdAt: now,
          updatedAt: now,
          completedAt: null,
          metadata: {},
        });
      }

      const updatedState = await tx
        .select()
        .from(onboardingState)
        .where(eq(onboardingState.id, flowId))
        .get();
      return updatedState as OnboardingState;
    });
  }

  async markFlowCompleted(flowId: OnboardingFlowId): Promise<OnboardingState> {
    return db.transaction(async (tx) => {
      const completedAt = new Date().toISOString();
      const state = await tx
        .select()
        .from(onboardingState)
        .where(eq(onboardingState.id, flowId))
        .get();

      if (state) {
        await tx
          .update(onboardingState)
          .set({ isCompleted: true, completedAt, updatedAt: completedAt })
          .where(eq(onboardingState.id, flowId));
      } else {
        await tx.insert(onboardingState).values({
          id: flowId,
          isCompleted: true,
          completedSteps: [],
          createdAt: completedAt,
          updatedAt: completedAt,
          completedAt: completedAt,
          metadata: {},
        });
      }

      const updatedState = await tx
        .select()
        .from(onboardingState)
        .where(eq(onboardingState.id, flowId))
        .get();
      return updatedState as OnboardingState;
    });
  }

  async resetFlow(flowId: OnboardingFlowId): Promise<OnboardingState> {
    return db.transaction(async (tx) => {
      const now = new Date().toISOString();
      const state = await tx
        .select()
        .from(onboardingState)
        .where(eq(onboardingState.id, flowId))
        .get();

      if (state) {
        await tx
          .update(onboardingState)
          .set({
            isCompleted: false,
            completedSteps: [],
            completedAt: null,
            updatedAt: now,
          })
          .where(eq(onboardingState.id, flowId));
      } else {
        await tx.insert(onboardingState).values({
          id: flowId,
          isCompleted: false,
          completedSteps: [],
          createdAt: now,
          updatedAt: now,
          completedAt: null,
          metadata: {},
        });
      }

      const updatedState = await tx
        .select()
        .from(onboardingState)
        .where(eq(onboardingState.id, flowId))
        .get();
      return updatedState as OnboardingState;
    });
  }

  async isInitialOnboardingCompleted(): Promise<boolean> {
    const state = await this.getOnboardingState("initial_onboarding");
    return state?.isCompleted ?? false;
  }

  async getSampleTrips(includeArchived = false): Promise<any[]> {
    const query = db.select().from(trips);
    const whereClause = includeArchived
      ? eq(trips.isSampleData, true)
      : and(eq(trips.isSampleData, true), eq(trips.isArchived, false));
    return query.where(whereClause).all();
  }

  async archiveSampleTrips(): Promise<void> {
    await db
      .update(trips)
      .set({ isArchived: true })
      .where(eq(trips.isSampleData, true));
  }

  async restoreSampleTrips(): Promise<void> {
    await this.deleteSampleTrips();
    // The actual loading will be done by the service
  }

  async deleteSampleTrips(): Promise<void> {
    await db.delete(trips).where(eq(trips.isSampleData, true));
  }

  async hasSampleData(): Promise<boolean> {
    const result = await db
      .select({ id: trips.id })
      .from(trips)
      .where(eq(trips.isSampleData, true))
      .limit(1)
      .get();
    return !!result;
  }

  async hasActiveSampleData(): Promise<boolean> {
    const result = await db
      .select({ id: trips.id })
      .from(trips)
      .where(and(eq(trips.isSampleData, true), eq(trips.isArchived, false)))
      .limit(1)
      .get();
    return !!result;
  }
}

export const onboardingRepository = new OnboardingRepository();
