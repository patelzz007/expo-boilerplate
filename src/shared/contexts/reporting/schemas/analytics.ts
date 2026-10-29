/** Milliseconds in one day. */
export const DAY_MS = 86_400_000;

/** Days in one analytics week (weekly buckets start on Monday 00:00 in the bucket time zone). */
const DAYS_PER_WEEK = 7;

/** Milliseconds in one week. */
export const WEEK_MS = DAYS_PER_WEEK * DAY_MS;
