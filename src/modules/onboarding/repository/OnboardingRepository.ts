import { db } from "@db/client";
import { userSettings } from "@db/schema/user-settings";
import { onboardingState } from "@db/schema/onboarding-state";
import { trips } from "@db/schema/trips";
import { eq } from "drizzle-orm";
import {
  OnboardingState,
  UserSettings,
  OnboardingFlowId,
  OnboardingStepId,
} from "../types";

export class OnboardingRepository {
  async getUserSettings(): Promise<UserSettings> {
    console.log("OnboardingRepository.getUserSettings");
    const settings = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.id, "default"))
      .get();
    if (!settings) {
      const newSettings: UserSettings = {
        id: "default",
        primaryUserName: null,
        defaultCurrency: "USD",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.insert(userSettings).values(newSettings);
      return newSettings;
    }
    return settings;
  }

  async updateUserSettings(
    update: Partial<UserSettings>,
  ): Promise<UserSettings> {
    console.log("OnboardingRepository.updateUserSettings", update);
    await db
      .update(userSettings)
      .set({ ...update, updatedAt: new Date().toISOString() })
      .where(eq(userSettings.id, "default"));
    return this.getUserSettings();
  }

  async getOnboardingState(
    flowId: OnboardingFlowId,
  ): Promise<OnboardingState | null> {
    console.log("OnboardingRepository.getOnboardingState", flowId);
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
    console.log("OnboardingRepository.markStepCompleted", flowId, stepId);
    const state = await this.getOnboardingState(flowId);
    if (state) {
      const completedSteps = [...(state.completedSteps || []), stepId];
      await db
        .update(onboardingState)
        .set({
          completedSteps: completedSteps,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(onboardingState.id, flowId));
    } else {
      await db.insert(onboardingState).values({
        id: flowId,
        isCompleted: false,
        completedSteps: [stepId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        metadata: {},
      });
    }
    return this.getOnboardingState(flowId);
  }

  async markFlowCompleted(flowId: OnboardingFlowId): Promise<OnboardingState> {
    console.log("OnboardingRepository.markFlowCompleted", flowId);
    const state = await this.getOnboardingState(flowId);
    const completedAt = new Date().toISOString();
    if (state) {
      await db
        .update(onboardingState)
        .set({ isCompleted: true, completedAt, updatedAt: completedAt })
        .where(eq(onboardingState.id, flowId));
    } else {
      await db.insert(onboardingState).values({
        id: flowId,
        isCompleted: true,
        completedSteps: [],
        createdAt: completedAt,
        updatedAt: completedAt,
        completedAt: completedAt,
        metadata: {},
      });
    }
    return this.getOnboardingState(flowId);
  }

  async isInitialOnboardingCompleted(): Promise<boolean> {
    console.log("OnboardingRepository.isInitialOnboardingCompleted");
    const state = await this.getOnboardingState("initial_onboarding");
    return state?.isCompleted ?? false;
  }

  async getSampleTrips(includeArchived = false): Promise<any[]> {
    console.log("OnboardingRepository.getSampleTrips");
    const query = db.select().from(trips).where(eq(trips.isSampleData, true));
    if (!includeArchived) {
      query.where(eq(trips.isArchived, false));
    }
    return query.all();
  }

  async archiveSampleTrips(): Promise<void> {
    console.log("OnboardingRepository.archiveSampleTrips");
    await db
      .update(trips)
      .set({ isArchived: true })
      .where(eq(trips.isSampleData, true));
  }

  async restoreSampleTrips(): Promise<void> {
    console.log("OnboardingRepository.restoreSampleTrips");
    await this.deleteSampleTrips();
    // The actual loading will be done by the service
  }

  async deleteSampleTrips(): Promise<void> {
    console.log("OnboardingRepository.deleteSampleTrips");
    await db.delete(trips).where(eq(trips.isSampleData, true));
  }

  async hasSampleData(): Promise<boolean> {
    console.log("OnboardingRepository.hasSampleData");
    const result = await db
      .select({ id: trips.id })
      .from(trips)
      .where(eq(trips.isSampleData, true))
      .limit(1)
      .get();
    return !!result;
  }

  async hasActiveSampleData(): Promise<boolean> {
    console.log("OnboardingRepository.hasActiveSampleData");
    const result = await db
      .select({ id: trips.id })
      .from(trips)
      .where(eq(trips.isSampleData, true))
      .where(eq(trips.isArchived, false))
      .limit(1)
      .get();
    return !!result;
  }
}

export const onboardingRepository = new OnboardingRepository();
