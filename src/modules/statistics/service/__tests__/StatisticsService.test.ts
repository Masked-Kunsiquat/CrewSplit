/**
 * STATISTICS SERVICE TESTS
 * LOCAL DATA ENGINEER: Service orchestration and error handling
 */

import type { ExpenseWithCategory } from "../../repository";
import type { Participant } from "@modules/participants";
import type { TripStatistics } from "../../types";

let computeStatistics: typeof import("../StatisticsService").computeStatistics;

const mockCalculateCategorySpending = jest.fn();
const mockCalculateParticipantSpending = jest.fn();
const mockGetExpensesWithCategories = jest.fn();
const mockGetTripCurrency = jest.fn();
const mockGetParticipantsForTrip = jest.fn();

const mockTripLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock("../../engine/calculate-category-spending", () => ({
  calculateCategorySpending: (...args: unknown[]) =>
    mockCalculateCategorySpending(...args),
}));

jest.mock("../../engine/calculate-participant-spending", () => ({
  calculateParticipantSpending: (...args: unknown[]) =>
    mockCalculateParticipantSpending(...args),
}));

jest.mock("../../repository", () => ({
  getExpensesWithCategories: (...args: unknown[]) =>
    mockGetExpensesWithCategories(...args),
  getTripCurrency: (...args: unknown[]) => mockGetTripCurrency(...args),
}));

jest.mock("@modules/participants/repository", () => ({
  getParticipantsForTrip: (...args: unknown[]) =>
    mockGetParticipantsForTrip(...args),
}));

jest.mock("@utils/logger", () => ({
  tripLogger: mockTripLogger,
}));

const createExpense = (
  overrides: Partial<ExpenseWithCategory> = {},
): ExpenseWithCategory => ({
  id: overrides.id ?? "expense-1",
  tripId: overrides.tripId ?? "trip-1",
  description: overrides.description ?? "Taxi",
  notes: overrides.notes ?? null,
  currency: overrides.currency ?? "USD",
  originalCurrency: overrides.originalCurrency ?? "USD",
  originalAmountMinor: overrides.originalAmountMinor ?? 1000,
  fxRateToTrip: overrides.fxRateToTrip ?? null,
  convertedAmountMinor: overrides.convertedAmountMinor ?? 1000,
  paidBy: overrides.paidBy ?? "participant-1",
  categoryId: overrides.categoryId ?? null,
  categoryName: overrides.categoryName ?? null,
  categoryEmoji: overrides.categoryEmoji ?? null,
  date: overrides.date ?? "2024-01-01",
  createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
  updatedAt: overrides.updatedAt ?? "2024-01-01T00:00:00.000Z",
});

const createParticipant = (
  overrides: Partial<Participant> = {},
): Participant => ({
  id: overrides.id ?? "participant-1",
  tripId: overrides.tripId ?? "trip-1",
  name: overrides.name ?? "Alex",
  createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
  avatarColor: overrides.avatarColor,
});

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("StatisticsService.computeStatistics", () => {
  beforeAll(async () => {
    ({ computeStatistics } = await import("../StatisticsService"));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("computes full statistics with repository and engine orchestration", async () => {
    // Arrange
    const expenses = [
      createExpense({
        id: "expense-1",
        convertedAmountMinor: 1200,
        categoryId: "cat-1",
        categoryName: "Food",
        categoryEmoji: "F",
      }),
      createExpense({
        id: "expense-2",
        convertedAmountMinor: 800,
        categoryId: "cat-1",
        categoryName: "Food",
        categoryEmoji: "F",
      }),
      createExpense({
        id: "expense-3",
        convertedAmountMinor: 500,
        categoryId: null,
        categoryName: null,
      }),
    ];
    const participants = [
      createParticipant({ id: "p1", name: "Alex" }),
      createParticipant({ id: "p2", name: "Brooke" }),
    ];

    mockGetExpensesWithCategories.mockResolvedValue(expenses);
    mockGetTripCurrency.mockResolvedValue("USD");
    mockGetParticipantsForTrip.mockResolvedValue(participants);

    mockCalculateParticipantSpending.mockReturnValue([
      {
        participantId: "p1",
        participantName: "Alex",
        totalPaid: 2000,
        percentage: 80,
      },
    ]);
    mockCalculateCategorySpending.mockReturnValue([
      {
        categoryId: "cat-1",
        categoryName: "Food",
        categoryEmoji: "F",
        totalAmount: 2000,
        expenseCount: 2,
        percentage: 80,
      },
    ]);

    const dependencies = {
      statisticsRepository: {
        getExpensesWithCategories: mockGetExpensesWithCategories,
        getTripCurrency: mockGetTripCurrency,
      },
      participantRepository: {
        getParticipantsForTrip: mockGetParticipantsForTrip,
      },
    };

    // Act
    const result = await computeStatistics("trip-1", dependencies);

    // Assert
    expect(result).toMatchObject<TripStatistics>({
      totalCost: 2500,
      currency: "USD",
      participantSpending: [
        {
          participantId: "p1",
          participantName: "Alex",
          totalPaid: 2000,
          percentage: 80,
        },
      ],
      categorySpending: [
        {
          categoryId: "cat-1",
          categoryName: "Food",
          categoryEmoji: "F",
          totalAmount: 2000,
          expenseCount: 2,
          percentage: 80,
        },
      ],
    });
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);

    expect(mockCalculateParticipantSpending).toHaveBeenCalledWith(
      expenses,
      participants,
    );
    expect(mockCalculateCategorySpending).toHaveBeenCalledWith(expenses, [
      { id: "cat-1", name: "Food", emoji: "F" },
    ]);
  });

  it("requests expenses, currency, and participants in parallel", async () => {
    // Arrange
    const expensesDeferred = createDeferred<ExpenseWithCategory[]>();
    const currencyDeferred = createDeferred<string>();
    const participantsDeferred = createDeferred<Participant[]>();

    mockGetExpensesWithCategories.mockReturnValue(expensesDeferred.promise);
    mockGetTripCurrency.mockReturnValue(currencyDeferred.promise);
    mockGetParticipantsForTrip.mockReturnValue(participantsDeferred.promise);
    mockCalculateParticipantSpending.mockReturnValue([]);
    mockCalculateCategorySpending.mockReturnValue([]);

    const dependencies = {
      statisticsRepository: {
        getExpensesWithCategories: mockGetExpensesWithCategories,
        getTripCurrency: mockGetTripCurrency,
      },
      participantRepository: {
        getParticipantsForTrip: mockGetParticipantsForTrip,
      },
    };

    // Act
    const promise = computeStatistics("trip-1", dependencies);

    // Assert
    expect(mockGetExpensesWithCategories).toHaveBeenCalledWith("trip-1");
    expect(mockGetTripCurrency).toHaveBeenCalledWith("trip-1");
    expect(mockGetParticipantsForTrip).toHaveBeenCalledWith("trip-1");

    expensesDeferred.resolve([]);
    currencyDeferred.resolve("USD");
    participantsDeferred.resolve([]);
    await promise;
  });

  it("deduplicates category references before calculation", async () => {
    // Arrange
    const expenses = [
      createExpense({
        id: "expense-1",
        categoryId: "cat-1",
        categoryName: "Meals",
        categoryEmoji: "M",
      }),
      createExpense({
        id: "expense-2",
        categoryId: "cat-1",
        categoryName: "Meals",
        categoryEmoji: "M",
      }),
      createExpense({
        id: "expense-3",
        categoryId: "cat-2",
        categoryName: null,
        categoryEmoji: "X",
      }),
    ];

    mockGetExpensesWithCategories.mockResolvedValue(expenses);
    mockGetTripCurrency.mockResolvedValue("USD");
    mockGetParticipantsForTrip.mockResolvedValue([]);
    mockCalculateParticipantSpending.mockReturnValue([]);
    mockCalculateCategorySpending.mockReturnValue([]);

    const dependencies = {
      statisticsRepository: {
        getExpensesWithCategories: mockGetExpensesWithCategories,
        getTripCurrency: mockGetTripCurrency,
      },
      participantRepository: {
        getParticipantsForTrip: mockGetParticipantsForTrip,
      },
    };

    // Act
    await computeStatistics("trip-1", dependencies);

    // Assert
    expect(mockCalculateCategorySpending).toHaveBeenCalledWith(expenses, [
      { id: "cat-1", name: "Meals", emoji: "M" },
    ]);
  });

  it("propagates TRIP_NOT_FOUND errors without wrapping", async () => {
    // Arrange
    const error = new Error("Trip not found") as Error & { code: string };
    error.code = "TRIP_NOT_FOUND";

    mockGetExpensesWithCategories.mockResolvedValue([]);
    mockGetTripCurrency.mockRejectedValue(error);
    mockGetParticipantsForTrip.mockResolvedValue([]);

    const dependencies = {
      statisticsRepository: {
        getExpensesWithCategories: mockGetExpensesWithCategories,
        getTripCurrency: mockGetTripCurrency,
      },
      participantRepository: {
        getParticipantsForTrip: mockGetParticipantsForTrip,
      },
    };

    // Act
    const promise = computeStatistics("trip-1", dependencies);

    // Assert
    await expect(promise).rejects.toBe(error);
    expect(mockTripLogger.error).not.toHaveBeenCalled();
  });

  it("wraps database errors as STATISTICS_DB_ERROR and logs them", async () => {
    // Arrange
    const dbError = new Error("SQLite failure");

    mockGetExpensesWithCategories.mockRejectedValue(dbError);
    mockGetTripCurrency.mockResolvedValue("USD");
    mockGetParticipantsForTrip.mockResolvedValue([]);

    const dependencies = {
      statisticsRepository: {
        getExpensesWithCategories: mockGetExpensesWithCategories,
        getTripCurrency: mockGetTripCurrency,
      },
      participantRepository: {
        getParticipantsForTrip: mockGetParticipantsForTrip,
      },
    };

    // Act
    const promise = computeStatistics("trip-1", dependencies);

    // Assert
    await expect(promise).rejects.toMatchObject({
      code: "STATISTICS_DB_ERROR",
      cause: dbError,
    });
    expect(mockTripLogger.error).toHaveBeenCalledWith(
      "Failed to compute statistics",
      expect.objectContaining({ tripId: "trip-1", error: dbError }),
    );
  });

  it("wraps partial failures when one repository call rejects", async () => {
    // Arrange
    const dbError = new Error("Timeout");

    mockGetExpensesWithCategories.mockResolvedValue([]);
    mockGetTripCurrency.mockRejectedValue(dbError);
    mockGetParticipantsForTrip.mockResolvedValue([]);

    const dependencies = {
      statisticsRepository: {
        getExpensesWithCategories: mockGetExpensesWithCategories,
        getTripCurrency: mockGetTripCurrency,
      },
      participantRepository: {
        getParticipantsForTrip: mockGetParticipantsForTrip,
      },
    };

    // Act
    const promise = computeStatistics("trip-1", dependencies);

    // Assert
    await expect(promise).rejects.toMatchObject({
      code: "STATISTICS_DB_ERROR",
    });
    expect(mockTripLogger.error).toHaveBeenCalled();
  });

  it("handles no expenses and returns zero totals", async () => {
    // Arrange
    mockGetExpensesWithCategories.mockResolvedValue([]);
    mockGetTripCurrency.mockResolvedValue("USD");
    mockGetParticipantsForTrip.mockResolvedValue([]);
    mockCalculateParticipantSpending.mockReturnValue([]);
    mockCalculateCategorySpending.mockReturnValue([]);

    const dependencies = {
      statisticsRepository: {
        getExpensesWithCategories: mockGetExpensesWithCategories,
        getTripCurrency: mockGetTripCurrency,
      },
      participantRepository: {
        getParticipantsForTrip: mockGetParticipantsForTrip,
      },
    };

    // Act
    const result = await computeStatistics("trip-1", dependencies);

    // Assert
    expect(result.totalCost).toBe(0);
    expect(result.currency).toBe("USD");
    expect(result.participantSpending).toEqual([]);
    expect(result.categorySpending).toEqual([]);
  });

  it("handles empty participant lists", async () => {
    // Arrange
    const expenses = [createExpense()];

    mockGetExpensesWithCategories.mockResolvedValue(expenses);
    mockGetTripCurrency.mockResolvedValue("USD");
    mockGetParticipantsForTrip.mockResolvedValue([]);
    mockCalculateParticipantSpending.mockReturnValue([]);
    mockCalculateCategorySpending.mockReturnValue([]);

    const dependencies = {
      statisticsRepository: {
        getExpensesWithCategories: mockGetExpensesWithCategories,
        getTripCurrency: mockGetTripCurrency,
      },
      participantRepository: {
        getParticipantsForTrip: mockGetParticipantsForTrip,
      },
    };

    // Act
    await computeStatistics("trip-1", dependencies);

    // Assert
    expect(mockCalculateParticipantSpending).toHaveBeenCalledWith(expenses, []);
  });

  it("passes empty category references when all expenses are uncategorized", async () => {
    // Arrange
    const expenses = [
      createExpense({ categoryId: null, categoryName: null }),
      createExpense({ categoryId: null, categoryName: null }),
    ];

    mockGetExpensesWithCategories.mockResolvedValue(expenses);
    mockGetTripCurrency.mockResolvedValue("USD");
    mockGetParticipantsForTrip.mockResolvedValue([]);
    mockCalculateParticipantSpending.mockReturnValue([]);
    mockCalculateCategorySpending.mockReturnValue([]);

    const dependencies = {
      statisticsRepository: {
        getExpensesWithCategories: mockGetExpensesWithCategories,
        getTripCurrency: mockGetTripCurrency,
      },
      participantRepository: {
        getParticipantsForTrip: mockGetParticipantsForTrip,
      },
    };

    // Act
    await computeStatistics("trip-1", dependencies);

    // Assert
    expect(mockCalculateCategorySpending).toHaveBeenCalledWith(expenses, []);
  });

  it("keeps totals in the trip currency using converted amounts", async () => {
    // Arrange
    const expenses = [
      createExpense({ convertedAmountMinor: 500 }),
      createExpense({ convertedAmountMinor: 250 }),
    ];

    mockGetExpensesWithCategories.mockResolvedValue(expenses);
    mockGetTripCurrency.mockResolvedValue("JPY");
    mockGetParticipantsForTrip.mockResolvedValue([]);
    mockCalculateParticipantSpending.mockReturnValue([]);
    mockCalculateCategorySpending.mockReturnValue([]);

    const dependencies = {
      statisticsRepository: {
        getExpensesWithCategories: mockGetExpensesWithCategories,
        getTripCurrency: mockGetTripCurrency,
      },
      participantRepository: {
        getParticipantsForTrip: mockGetParticipantsForTrip,
      },
    };

    // Act
    const result = await computeStatistics("trip-1", dependencies);

    // Assert
    expect(result.totalCost).toBe(750);
    expect(result.currency).toBe("JPY");
  });
});
