/**
 * STATISTICS HOOK TESTS
 * UI/UX ENGINEER: Hook state and data flow without rendering UI
 */

import React, { useEffect } from "react";
import renderer, { act } from "react-test-renderer";
import type { TripStatistics } from "../../types";
import { useStatistics } from "../use-statistics";

const mockComputeStatistics = jest.fn();

jest.mock("../../service/StatisticsService", () => ({
  StatisticsService: {
    computeStatistics: (...args: unknown[]) => mockComputeStatistics(...args),
  },
}));

jest.mock("expo-router", () => ({
  useFocusEffect: jest.fn(),
}));

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const createStatistics = (
  overrides: Partial<TripStatistics> = {},
): TripStatistics => ({
  totalCost: overrides.totalCost ?? 0,
  currency: overrides.currency ?? "USD",
  participantSpending: overrides.participantSpending ?? [],
  categorySpending: overrides.categorySpending ?? [],
  timestamp: overrides.timestamp ?? "2024-01-01T00:00:00.000Z",
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

type HookResult = ReturnType<typeof useStatistics>;

const renderUseStatistics = (tripId: string | null) => {
  let latest: HookResult | null = null;

  const HookHarness = ({ id }: { id: string | null }) => {
    const value = useStatistics(id);
    useEffect(() => {
      latest = value;
    }, [value]);
    return null;
  };

  let root: renderer.ReactTestRenderer;
  act(() => {
    root = renderer.create(React.createElement(HookHarness, { id: tripId }));
  });

  return {
    getLatest: () => latest,
    rerender: (nextTripId: string | null) => {
      act(() => {
        root.update(React.createElement(HookHarness, { id: nextTripId }));
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
};

describe("useStatistics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sets isLoading true on mount while data is pending", async () => {
    // Arrange
    const deferred = createDeferred<TripStatistics>();
    mockComputeStatistics.mockReturnValue(deferred.promise);

    // Act
    const harness = renderUseStatistics("trip-1");
    await act(async () => {
      await flushPromises();
    });

    // Assert
    const result = harness.getLatest();
    expect(result?.isLoading).toBe(true);
    expect(result?.error).toBeNull();
    expect(mockComputeStatistics).toHaveBeenCalledWith("trip-1");

    deferred.resolve(createStatistics());
    await act(async () => {
      await flushPromises();
    });
    harness.unmount();
  });

  it("returns statistics on successful fetch", async () => {
    // Arrange
    const stats = createStatistics({
      totalCost: 2500,
      currency: "EUR",
      timestamp: "2024-02-02T00:00:00.000Z",
    });
    mockComputeStatistics.mockResolvedValue(stats);

    // Act
    const harness = renderUseStatistics("trip-1");
    await act(async () => {
      await flushPromises();
    });

    // Assert
    const result = harness.getLatest();
    expect(result?.isLoading).toBe(false);
    expect(result?.error).toBeNull();
    expect(result?.statistics).toBe(stats);
    expect(result?.statistics.timestamp).toBe("2024-02-02T00:00:00.000Z");
    expect(result?.statistics.currency).toBe("EUR");
    harness.unmount();
  });

  it("returns emptyStatistics when tripId is null without calling the service", async () => {
    // Arrange
    // Act
    const harness = renderUseStatistics(null);
    await act(async () => {
      await flushPromises();
    });

    // Assert
    const result = harness.getLatest();
    expect(mockComputeStatistics).not.toHaveBeenCalled();
    expect(result?.statistics.totalCost).toBe(0);
    expect(result?.statistics.currency).toBe("USD");
    expect(new Date(result?.statistics.timestamp ?? "").toISOString()).toBe(
      result?.statistics.timestamp,
    );

    harness.rerender(null);
    await act(async () => {
      await flushPromises();
    });
    const resultAfter = harness.getLatest();
    expect(resultAfter?.statistics).toBe(result?.statistics);

    harness.unmount();
  });

  it("memoizes statistics and refetch references when tripId is stable", async () => {
    // Arrange
    const stats = createStatistics({ totalCost: 1000 });
    mockComputeStatistics.mockResolvedValue(stats);

    // Act
    const harness = renderUseStatistics("trip-1");
    await act(async () => {
      await flushPromises();
    });
    const first = harness.getLatest();

    harness.rerender("trip-1");
    await act(async () => {
      await flushPromises();
    });
    const second = harness.getLatest();

    // Assert
    expect(second?.statistics).toBe(first?.statistics);
    expect(second?.refetch).toBe(first?.refetch);
    expect(mockComputeStatistics).toHaveBeenCalledTimes(1);
    harness.unmount();
  });

  it("triggers a new service call when tripId changes", async () => {
    // Arrange
    mockComputeStatistics
      .mockResolvedValueOnce(createStatistics({ totalCost: 100 }))
      .mockResolvedValueOnce(createStatistics({ totalCost: 200 }));

    // Act
    const harness = renderUseStatistics("trip-1");
    await act(async () => {
      await flushPromises();
    });

    harness.rerender("trip-2");
    await act(async () => {
      await flushPromises();
    });

    // Assert
    expect(mockComputeStatistics).toHaveBeenCalledTimes(2);
    expect(mockComputeStatistics).toHaveBeenNthCalledWith(1, "trip-1");
    expect(mockComputeStatistics).toHaveBeenNthCalledWith(2, "trip-2");
    harness.unmount();
  });

  it("sets error state with default message when service throws non-Error", async () => {
    // Arrange
    mockComputeStatistics.mockRejectedValue("boom");

    // Act
    const harness = renderUseStatistics("trip-1");
    await act(async () => {
      await flushPromises();
    });

    // Assert
    const result = harness.getLatest();
    expect(result?.isLoading).toBe(false);
    expect(result?.error?.message).toBe("Failed to load trip statistics");
    harness.unmount();
  });

  it("propagates error objects from the service", async () => {
    // Arrange
    const error = Object.assign(new Error("Trip missing"), {
      code: "TRIP_NOT_FOUND",
    });
    mockComputeStatistics.mockRejectedValue(error);

    // Act
    const harness = renderUseStatistics("trip-1");
    await act(async () => {
      await flushPromises();
    });

    // Assert
    const result = harness.getLatest();
    expect(result?.error).toBe(error);
    expect((result?.error as Error & { code?: string })?.code).toBe(
      "TRIP_NOT_FOUND",
    );
    harness.unmount();
  });

  it("refetches data and clears errors after a successful retry", async () => {
    // Arrange
    mockComputeStatistics
      .mockRejectedValueOnce(new Error("Network down"))
      .mockResolvedValueOnce(createStatistics({ totalCost: 400 }));

    const harness = renderUseStatistics("trip-1");
    await act(async () => {
      await flushPromises();
    });
    const resultAfterError = harness.getLatest();
    expect(resultAfterError?.error).toBeInstanceOf(Error);

    // Act
    act(() => {
      resultAfterError?.refetch();
    });
    await act(async () => {
      await flushPromises();
    });

    // Assert
    const resultAfterRetry = harness.getLatest();
    expect(mockComputeStatistics).toHaveBeenCalledTimes(2);
    expect(resultAfterRetry?.error).toBeNull();
    expect(resultAfterRetry?.statistics.totalCost).toBe(400);
    harness.unmount();
  });
});
