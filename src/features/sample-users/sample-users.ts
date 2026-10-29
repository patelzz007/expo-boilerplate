// The sample users the Home screen lists, read from JSONPlaceholder — a free, public, read-only demo
// API (https://jsonplaceholder.typicode.com). It is the app's only network request: the rest of the
// app runs on local sample data. The response crosses a trust boundary, so it is parsed with zod once,
// here (rules/28); everything past this file uses the parsed `SampleUser`.
//
// The address is the same in every environment (it is a public demo service, not this product's API),
// so it is a constant rather than Expo config.

import { z } from "zod";

export const SAMPLE_USERS_URL = "https://jsonplaceholder.typicode.com/users";

/** The fields the list shows; the API sends more (address, phone, website), which zod drops. */
export const sampleUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  username: z.string().min(1),
  email: z.email(),
  company: z.object({ name: z.string().min(1) }),
});

export type SampleUser = z.infer<typeof sampleUserSchema>;

const sampleUsersSchema = z.array(sampleUserSchema);

/** The request was answered with an error status (the body is not read). */
export class SampleUsersRequestError extends Error {
  public readonly status: number;

  public constructor(status: number) {
    super(`The users could not be loaded (HTTP ${String(status)}).`);
    this.name = "SampleUsersRequestError";
    this.status = status;
  }
}

/**
 * Fetches and parses the users. Rejects with `SampleUsersRequestError` on an error status, with zod's
 * error when the body is not the expected shape, and with the fetch error when the network fails or
 * `signal` aborts (TanStack Query aborts it when the query is cancelled).
 */
export async function fetchSampleUsers(signal: AbortSignal): Promise<readonly SampleUser[]> {
  const response = await fetch(SAMPLE_USERS_URL, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new SampleUsersRequestError(response.status);
  }
  return sampleUsersSchema.parse(await response.json());
}
