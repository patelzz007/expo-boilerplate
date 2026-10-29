// The sample users as server state: TanStack Query owns them (rules/06). They are cached under one
// key, so returning to Home shows the cached list at once and refetches in the background only once
// it is stale (the client's defaults, lib/query-client.ts).

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { fetchSampleUsers, type SampleUser } from "./sample-users";

/** The feature's query keys, built in one place (rules/06). The request takes no inputs. */
export const sampleUserKeys = {
  all: (): readonly ["sample-users"] => ["sample-users"],
  list: (): readonly ["sample-users", "list"] => ["sample-users", "list"],
};

export function useSampleUsers(): UseQueryResult<readonly SampleUser[]> {
  return useQuery({
    queryKey: sampleUserKeys.list(),
    queryFn: ({ signal }): Promise<readonly SampleUser[]> => fetchSampleUsers(signal),
  });
}
