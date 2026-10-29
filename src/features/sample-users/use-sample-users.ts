// The sample users as server state: TanStack Query owns them (rules/06). Each page and each user is
// cached under its own key, so going back to a page or a person shows it at once and refetches in the
// background only once stale (the client's defaults, lib/query-client.ts). While another page loads,
// the previous one stays on screen.

import { keepPreviousData, skipToken, useQuery, type UseQueryResult } from "@tanstack/react-query";

import { MAX_QUERY_RETRIES } from "../../lib/query-client";
import { useMobileEnv } from "../../runtime/runtime-context";
import {
  fetchSampleUserDetails,
  fetchSampleUsersPage,
  isUserNotFound,
  type SampleUserDetails,
  type SampleUsersPage,
  type SampleUsersPageRequest,
} from "./sample-users";

/** Users per page of the Home screen's list (JSONPlaceholder has 10). */
export const SAMPLE_USERS_PAGE_SIZE = 4;

/**
 * The feature's query keys, built in one place so every input is part of its key (rules/06). The API's
 * address is not an input: it is configuration, fixed for the app's life (src/lib/env.ts).
 */
export const sampleUserKeys = {
  all: (): readonly ["sample-users"] => ["sample-users"],
  lists: (): readonly ["sample-users", "list"] => ["sample-users", "list"],
  list: (request: SampleUsersPageRequest): readonly ["sample-users", "list", SampleUsersPageRequest] => [
    "sample-users",
    "list",
    request,
  ],
  details: (): readonly ["sample-users", "detail"] => ["sample-users", "detail"],
  detail: (id: number | null): readonly ["sample-users", "detail", number | null] => ["sample-users", "detail", id],
};

/** Retries a failure that might pass next time; never a "no such user", which would only answer the same. */
export function retryUnlessNotFound(failureCount: number, error: Error): boolean {
  return !isUserNotFound(error) && failureCount < MAX_QUERY_RETRIES;
}

/** One page of the list (1-based). */
export function useSampleUsersPage(page: number): UseQueryResult<SampleUsersPage> {
  const { jsonPlaceholderUrl } = useMobileEnv();
  const request: SampleUsersPageRequest = { page, pageSize: SAMPLE_USERS_PAGE_SIZE };
  return useQuery({
    queryKey: sampleUserKeys.list(request),
    queryFn: ({ signal }): Promise<SampleUsersPage> => fetchSampleUsersPage(jsonPlaceholderUrl, request, signal),
    placeholderData: keepPreviousData,
    retry: retryUnlessNotFound,
  });
}

/** One user in full; `null` (a route without a valid id) requests nothing. */
export function useSampleUserDetails(id: number | null): UseQueryResult<SampleUserDetails> {
  const { jsonPlaceholderUrl } = useMobileEnv();
  return useQuery({
    queryKey: sampleUserKeys.detail(id),
    queryFn:
      id === null
        ? skipToken
        : ({ signal }): Promise<SampleUserDetails> => fetchSampleUserDetails(jsonPlaceholderUrl, id, signal),
    retry: retryUnlessNotFound,
  });
}
