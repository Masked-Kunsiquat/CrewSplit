/**
 * STABLE JSON
 * Deterministic stringify by recursively sorting object keys.
 */

import { createAppError } from "@utils/errors";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function toSortedJson(value: unknown): Json {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toSortedJson);
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    const out: Record<string, Json> = {};
    for (const key of keys) {
      out[key] = toSortedJson(value[key]);
    }
    return out;
  }

  throw createAppError(
    "INVALID_INPUT",
    `stableStringify received non-JSON value: ${Object.prototype.toString.call(
      value,
    )}`,
  );
}

export function stableStringify(value: unknown, space = 2): string {
  return JSON.stringify(toSortedJson(value), null, space);
}
