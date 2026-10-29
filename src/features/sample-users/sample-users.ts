// The sample users the Home screen lists, read from JSONPlaceholder — a free, public, read-only demo
// API (https://jsonplaceholder.typicode.com). It is the app's only network source: the rest of the
// app runs on local sample data. Responses cross a trust boundary, so they are parsed with zod once,
// here (rules/28); everything past this file uses the parsed types.
//
// The address is the same in every environment (it is a public demo service, not this product's API),
// so it is a constant rather than Expo config.

import { z } from "zod";

export const SAMPLE_USERS_URL = "https://jsonplaceholder.typicode.com/users";

/** The header the API answers a paged request with: how many users there are in all. */
export const TOTAL_COUNT_HEADER = "X-Total-Count";

/** Statuses from this one up are the server's fault: worth retrying, unlike a missing user. */
const FIRST_SERVER_ERROR_STATUS = 500;

/** The fields the list shows; the API sends more (address, phone, website), which zod drops. */
export const sampleUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  username: z.string().min(1),
  email: z.email(),
  company: z.object({ name: z.string().min(1) }),
});

export type SampleUser = z.infer<typeof sampleUserSchema>;

/** One user in full, for the details screen. */
export const sampleUserDetailsSchema = sampleUserSchema.extend({
  phone: z.string().min(1),
  website: z.string().min(1),
  address: z.object({
    street: z.string().min(1),
    suite: z.string().min(1),
    city: z.string().min(1),
    zipcode: z.string().min(1),
  }),
  company: z.object({
    name: z.string().min(1),
    catchPhrase: z.string().min(1),
    bs: z.string().min(1),
  }),
});

export type SampleUserDetails = z.infer<typeof sampleUserDetailsSchema>;

const sampleUsersSchema = z.array(sampleUserSchema);

/** The total-count header: a whole number, sent as text. */
const totalCountSchema = z
  .string()
  .regex(/^\d+$/)
  .transform((count: string): number => Number(count));

/** One page of the list: 1-based `page`, `pageSize` users per page. */
export interface SampleUsersPageRequest {
  readonly page: number;
  readonly pageSize: number;
}

export interface SampleUsersPage {
  readonly users: readonly SampleUser[];
  /** How many users there are across every page. */
  readonly total: number;
}

/** The request was answered with an error status (the body is not read). */
export class SampleUsersRequestError extends Error {
  public readonly status: number;

  public constructor(status: number) {
    super(`The users could not be loaded (HTTP ${String(status)}).`);
    this.name = "SampleUsersRequestError";
    this.status = status;
  }

  /** A 4xx: asking again gets the same answer. */
  public get isClientError(): boolean {
    return this.status < FIRST_SERVER_ERROR_STATUS;
  }
}

/** The API answered this request with "no such user". */
export function isUserNotFound(error: Error | null): boolean {
  return error instanceof SampleUsersRequestError && error.isClientError;
}

async function getJson(url: string, signal: AbortSignal): Promise<Response> {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new SampleUsersRequestError(response.status);
  }
  return response;
}

/**
 * Fetches and parses one page of users. Rejects with `SampleUsersRequestError` on an error status,
 * with zod's error when the body or the total-count header is not the expected shape, and with the
 * fetch error when the network fails or `signal` aborts (TanStack Query aborts a cancelled query).
 */
export async function fetchSampleUsersPage(
  { page, pageSize }: SampleUsersPageRequest,
  signal: AbortSignal
): Promise<SampleUsersPage> {
  const response = await getJson(`${SAMPLE_USERS_URL}?_page=${String(page)}&_limit=${String(pageSize)}`, signal);
  return {
    users: sampleUsersSchema.parse(await response.json()),
    total: totalCountSchema.parse(response.headers.get(TOTAL_COUNT_HEADER)),
  };
}

/** Fetches and parses one user in full; rejects like `fetchSampleUsersPage` (a 404 for an unknown id). */
export async function fetchSampleUserDetails(id: number, signal: AbortSignal): Promise<SampleUserDetails> {
  const response = await getJson(`${SAMPLE_USERS_URL}/${String(id)}`, signal);
  return sampleUserDetailsSchema.parse(await response.json());
}
