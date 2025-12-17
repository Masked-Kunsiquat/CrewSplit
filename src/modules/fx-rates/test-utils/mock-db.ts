// ROLE: QA + TESTING ENGINEER — Responsible for test utilities and mocks
/**
 * In-memory Drizzle/SQLite mock for FX rate tests.
 * Provides minimal query builders used by the repository.
 */

import type { FxRateSource } from "@db/schema/fx-rates";

export type MockFxRateRow = {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  source: FxRateSource;
  fetchedAt: string;
  priority: number;
  metadata: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

type Condition =
  | { type: "eq"; column: keyof MockFxRateRow; value: unknown }
  | { type: "and"; clauses: Condition[] }
  | { type: "or"; clauses: Condition[] }
  | { type: "lt"; column: keyof MockFxRateRow; value: unknown };

type SqlDescriptor =
  | { sqlType: "min"; column: keyof MockFxRateRow }
  | { sqlType: "count" }
  | { sqlType: "raw" };

type SqlLike = SqlDescriptor | Condition;

export const eq = (column: keyof MockFxRateRow, value: unknown): Condition => ({
  type: "eq",
  column,
  value,
});

export const and = (...clauses: Condition[]): Condition => ({
  type: "and",
  clauses,
});

export const or = (...clauses: Condition[]): Condition => ({
  type: "or",
  clauses,
});

export const desc = (column: keyof MockFxRateRow) => ({
  type: "desc" as const,
  column,
});

export const sql = (
  strings: TemplateStringsArray,
  ...values: unknown[]
): SqlLike => {
  const raw = strings.join("");

  if (raw.includes("MIN")) {
    return { sqlType: "min", column: values[0] as keyof MockFxRateRow };
  }

  if (raw.includes("COUNT")) {
    return { sqlType: "count" };
  }

  if (raw.includes("<")) {
    return {
      type: "lt",
      column: values[0] as keyof MockFxRateRow,
      value: values[1],
    };
  }

  return { sqlType: "raw" };
};

const evaluateCondition = (
  row: MockFxRateRow,
  condition?: Condition,
): boolean => {
  if (!condition) return true;

  switch (condition.type) {
    case "eq":
      return row[condition.column] === condition.value;
    case "lt": {
      const left = row[condition.column];
      const right = condition.value;

      if (
        left === null ||
        left === undefined ||
        right === null ||
        right === undefined
      ) {
        return false;
      }

      if (typeof left === "number" && typeof right === "number") {
        return left < right;
      }

      return String(left) < String(right);
    }
    case "and":
      return condition.clauses.every((clause) =>
        evaluateCondition(row, clause),
      );
    case "or":
      return condition.clauses.some((clause) => evaluateCondition(row, clause));
    default:
      return true;
  }
};

const applyOrder = (
  rows: MockFxRateRow[],
  order?: { type: "desc"; column: keyof MockFxRateRow }[],
) => {
  if (!order || order.length === 0) return rows;

  return [...rows].sort((a, b) => {
    for (const ord of order) {
      const left = a[ord.column];
      const right = b[ord.column];

      if (left === right) continue;
      return left < right ? 1 : -1; // desc
    }
    return 0;
  });
};

class QueryBuilder {
  private whereCond?: Condition;
  private order: { type: "desc"; column: keyof MockFxRateRow }[] = [];
  private limitCount?: number;

  constructor(
    private readonly db: InMemoryDb,
    private readonly selection?: Record<string, SqlDescriptor>,
  ) {}

  from() {
    return this;
  }

  where(cond?: Condition) {
    this.whereCond = cond;
    return this;
  }

  orderBy(...order: { type: "desc"; column: keyof MockFxRateRow }[]) {
    this.order = order;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  private buildResult(): any[] {
    let rows = this.db.rows.filter((row) =>
      evaluateCondition(row, this.whereCond),
    );
    rows = applyOrder(rows, this.order);
    if (typeof this.limitCount === "number") {
      rows = rows.slice(0, this.limitCount);
    }

    if (!this.selection) {
      return rows.map((row) => ({ ...row }));
    }

    const result: Record<string, unknown> = {};
    for (const [key, descriptor] of Object.entries(this.selection)) {
      if ((descriptor as any).sqlType === "min") {
        const column = (descriptor as any).column as keyof MockFxRateRow;
        const values = rows.map((r) => r[column]).filter(Boolean) as string[];
        result[key] = values.length ? values.sort()[0] : null;
      } else if ((descriptor as any).sqlType === "count") {
        result[key] = rows.length;
      }
    }
    return [result];
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?:
      | ((value: any[]) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ) {
    return Promise.resolve(this.buildResult()).then(onfulfilled, onrejected);
  }
}

class UpdateBuilder {
  private values: Partial<MockFxRateRow> = {};
  private cond?: Condition;

  constructor(private readonly db: InMemoryDb) {}

  set(values: Partial<MockFxRateRow>) {
    this.values = values;
    return this;
  }

  where(cond?: Condition) {
    this.cond = cond;
    this.db.rows = this.db.rows.map((row) => {
      if (evaluateCondition(row, this.cond)) {
        return { ...row, ...this.values };
      }
      return row;
    });
    return Promise.resolve();
  }
}

class InsertBuilder {
  private record: MockFxRateRow | MockFxRateRow[] | undefined;
  private inserted = false;

  constructor(private readonly db: InMemoryDb) {}

  values(record: MockFxRateRow | MockFxRateRow[]) {
    this.record = record;
    return this;
  }

  private ensureInserted(): MockFxRateRow[] {
    if (this.inserted || !this.record) {
      return Array.isArray(this.record)
        ? this.record
        : this.record
          ? [this.record]
          : [];
    }
    const records = Array.isArray(this.record) ? this.record : [this.record];
    this.db.rows = [...this.db.rows, ...records.map((r) => ({ ...r }))];
    this.inserted = true;
    return records;
  }

  returning() {
    const records = this.ensureInserted();
    return Promise.resolve(records);
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?:
      | ((value: any) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ) {
    const result = this.ensureInserted();
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

export class InMemoryDb {
  rows: MockFxRateRow[] = [];

  select(selection?: Record<string, SqlDescriptor>) {
    return new QueryBuilder(this, selection);
  }

  update() {
    return new UpdateBuilder(this);
  }

  insert() {
    return new InsertBuilder(this);
  }

  /**
   * Mock transaction helper (no real ACID semantics).
   * Invokes the callback synchronously and wraps the result in Promise.resolve.
   * No rollback or isolation is provided; errors are propagated without undoing prior writes.
   *
   * @param callback - Function invoked with this in-memory DB
   * @returns Promise of the callback result
   */
  transaction<T>(callback: (tx: InMemoryDb) => Promise<T> | T): Promise<T> {
    return Promise.resolve(callback(this));
  }

  reset(rows: MockFxRateRow[] = []) {
    this.rows = rows.map((r) => ({ ...r }));
  }
}

export const mockDb = new InMemoryDb();

export const mockFxRatesTable = {
  id: "id",
  baseCurrency: "baseCurrency",
  quoteCurrency: "quoteCurrency",
  rate: "rate",
  source: "source",
  fetchedAt: "fetchedAt",
  priority: "priority",
  metadata: "metadata",
  isArchived: "isArchived",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const;

export const createRateRow = (
  overrides: Partial<MockFxRateRow>,
): MockFxRateRow => ({
  id: overrides.id ?? "rate-id",
  baseCurrency: overrides.baseCurrency ?? "USD",
  quoteCurrency: overrides.quoteCurrency ?? "EUR",
  rate: overrides.rate ?? 0.9,
  source: overrides.source ?? "frankfurter",
  fetchedAt: overrides.fetchedAt ?? "2024-01-01T00:00:00.000Z",
  priority: overrides.priority ?? 50,
  metadata: overrides.metadata ?? null,
  isArchived: overrides.isArchived ?? false,
  createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
  updatedAt: overrides.updatedAt ?? "2024-01-01T00:00:00.000Z",
});

export const drizzleOrmMock = { eq, and, or, desc, sql };
