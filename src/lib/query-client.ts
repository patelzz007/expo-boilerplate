// ============================================
// query-client.ts - the app's TanStack Query client
// ============================================
// Server state belongs to TanStack Query (rules/06). Project-wide defaults are set once here.

import { QueryClient } from "@tanstack/react-query";

/** Data counts as fresh for 30 s; screens refetch on focus and pull-to-refresh after that. */
const STALE_TIME_MS = 30_000;

/** Unused cache entries are dropped after 5 minutes. */
const GC_TIME_MS = 300_000;

/** A failed query is retried this many times. */
const MAX_QUERY_RETRIES = 2;

/**
 * Drops every cached query AND mutation and stops their garbage-collection timers.
 * `QueryClient.clear()` destroys the queries but only drops the mutations, whose timers would keep
 * each dropped mutation (variables, result) alive for `gcTime` — so each mutation is destroyed first.
 */
export function clearQueryClient(queryClient: QueryClient): void {
  for (const mutation of queryClient.getMutationCache().getAll()) {
    mutation.destroy();
  }
  queryClient.clear();
}

export function createMobileQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: STALE_TIME_MS, gcTime: GC_TIME_MS, retry: MAX_QUERY_RETRIES },
      mutations: { retry: false },
    },
  });
}
