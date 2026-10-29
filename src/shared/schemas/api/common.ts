import { z } from "zod";

/**
 * Epoch milliseconds (UTC) — the single time representation across the DB,
 * API, and UI. Branded (via Zod's `$brand`) so an ISO string or any other
 * plain number can never silently flow where a timestamp is expected.
 */
export type EpochMs = z.output<typeof EpochMsSchema>;

/**
 * Zod schema for epoch-ms timestamps. Runtime validation accepts any
 * non-negative integer (milliseconds); the output type is branded `EpochMs`
 * so consumers get strict typing and ISO-string regressions fail to compile.
 */
export const EpochMsSchema = z.number().int().nonnegative().brand("EpochMs");

/** The one sanctioned way to stamp "now" as an epoch-ms value. */
export function nowEpochMs(): EpochMs {
  return EpochMsSchema.parse(Date.now());
}

/**
 * Convert a plain number to an `EpochMs`. Normalizes non-integer inputs
 * (e.g. bucket-boundary math like `fromMs + i * (span / 24)`) by rounding to
 * the nearest millisecond before validating.
 */
export function epochMs(value: number): EpochMs {
  return EpochMsSchema.parse(Math.round(value));
}
