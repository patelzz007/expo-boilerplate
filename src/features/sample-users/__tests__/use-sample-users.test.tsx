import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import * as React from "react";

import { trackQueryClient } from "../../../../test/query-clients";
import { sampleUserKeys, useSampleUsers } from "../use-sample-users";
import { API_USERS, jsonResponse, PARSED_USERS } from "./sample-users-responses";

const SERVER_ERROR = 500;

/** A client that does not retry, so a failure settles at once; data stays fresh for the test. */
function createClient(): QueryClient {
  return trackQueryClient(
    new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } } })
  );
}

function wrapperFor(
  queryClient: QueryClient
): ({ children }: { readonly children: React.ReactNode }) => React.JSX.Element {
  return function Wrapper({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useSampleUsers", () => {
  it("loads the users under the feature's list key", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(API_USERS));
    const queryClient = createClient();

    const { result } = await renderHook(useSampleUsers, { wrapper: wrapperFor(queryClient) });

    expect(result.current.status).toBe("pending");
    await waitFor((): void => {
      expect(result.current.status).toBe("success");
    });
    expect(result.current.data).toEqual(PARSED_USERS);
    expect(queryClient.getQueryData(sampleUserKeys.list())).toEqual(PARSED_USERS);
  });

  it("serves a second screen from the cache without another request", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(API_USERS));
    const queryClient = createClient();
    const first = await renderHook(useSampleUsers, { wrapper: wrapperFor(queryClient) });
    await waitFor((): void => {
      expect(first.result.current.status).toBe("success");
    });

    const second = await renderHook(useSampleUsers, { wrapper: wrapperFor(queryClient) });

    expect(second.result.current.status).toBe("success");
    expect(second.result.current.data).toEqual(PARSED_USERS);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("reports a failed request as an error", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, SERVER_ERROR));

    const { result } = await renderHook(useSampleUsers, { wrapper: wrapperFor(createClient()) });

    await waitFor((): void => {
      expect(result.current.status).toBe("error");
    });
    expect(result.current.data).toBeUndefined();
  });
});
