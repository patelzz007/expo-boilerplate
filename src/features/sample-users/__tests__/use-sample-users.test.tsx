import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react-native";
import * as React from "react";
import { Pressable, Text } from "react-native";

import { createTestRuntime } from "../../../../test/app-harness";
import { trackQueryClient } from "../../../../test/query-clients";
import { ReadyRuntimeProvider } from "../../../runtime/runtime-context";
import { SampleUsersRequestError } from "../sample-users";
import {
  retryUnlessNotFound,
  SAMPLE_USERS_PAGE_SIZE,
  sampleUserKeys,
  useSampleUserDetails,
  useSampleUsersPage,
} from "../use-sample-users";
import {
  API_USER_DETAILS,
  API_USERS,
  FIRST_PAGE,
  jsonResponse,
  pageResponse,
  PARSED_USER_DETAILS,
} from "./sample-users-responses";

const SERVER_ERROR = 500;
const NOT_FOUND = 404;
const PAGE_ONE = 1;
const PAGE_TWO = 2;

/**
 * Data stays fresh for the test, and a retry (the hooks set their own retry rule) runs at once
 * instead of after a back-off, so a failure settles within the test.
 */
function createClient(): QueryClient {
  return trackQueryClient(
    new QueryClient({ defaultOptions: { queries: { retryDelay: 0, staleTime: Number.POSITIVE_INFINITY } } })
  );
}

/** `fetch` answers every call with a fresh response: a response's body can be read only once. */
function answerFetchWith(respond: () => Response): jest.SpiedFunction<typeof fetch> {
  return jest.spyOn(globalThis, "fetch").mockImplementation((): Promise<Response> => Promise.resolve(respond()));
}

interface WrapperProps {
  readonly children: React.ReactNode;
}

/** The app runtime the hooks read their configuration from (JSONPlaceholder, the default address). */
const TEST_RUNTIME = createTestRuntime();

function wrapperFor(queryClient: QueryClient): (props: WrapperProps) => React.JSX.Element {
  return function Wrapper({ children }: WrapperProps): React.JSX.Element {
    return (
      <ReadyRuntimeProvider runtime={TEST_RUNTIME}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ReadyRuntimeProvider>
    );
  };
}

/** The hook as a screen uses it: the page lives in state and a button moves to the next one. */
function PagedUsers(): React.JSX.Element {
  const [page, setPage] = React.useState(PAGE_ONE);
  const users = useSampleUsersPage(page);
  const nextPage = React.useCallback((): void => {
    setPage(PAGE_TWO);
  }, []);
  const ids = users.data?.users.map((user): string => String(user.id)).join(", ") ?? "";
  return (
    <>
      <Text>{`Page ${String(page)}${users.isPlaceholderData ? " (loading)" : ""}: ${ids}`}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Next page" onPress={nextPage} />
    </>
  );
}

describe("useSampleUsersPage", () => {
  it("loads a page under a key that names the page and its size", async () => {
    answerFetchWith((): Response => pageResponse(API_USERS));
    const queryClient = createClient();

    const { result } = await renderHook(() => useSampleUsersPage(PAGE_ONE), { wrapper: wrapperFor(queryClient) });

    expect(result.current.status).toBe("pending");
    await waitFor((): void => {
      expect(result.current.status).toBe("success");
    });
    expect(result.current.data).toEqual(FIRST_PAGE);
    expect(queryClient.getQueryData(sampleUserKeys.list({ page: PAGE_ONE, pageSize: SAMPLE_USERS_PAGE_SIZE }))).toEqual(
      FIRST_PAGE
    );
  });

  it("keeps the page on screen while the next one loads, then shows the next", async () => {
    let answerSecondPage: (response: Response) => void = (): void => undefined;
    const secondPage = new Promise<Response>((resolve): void => {
      answerSecondPage = resolve;
    });
    const fetchSpy = jest
      .spyOn(globalThis, "fetch")
      .mockImplementation((input: RequestInfo | URL): Promise<Response> =>
        new Request(input).url.includes("_page=2") ? secondPage : Promise.resolve(pageResponse(API_USERS))
      );
    await render(
      <ReadyRuntimeProvider runtime={TEST_RUNTIME}>
        <QueryClientProvider client={createClient()}>
          <PagedUsers />
        </QueryClientProvider>
      </ReadyRuntimeProvider>
    );
    expect(await screen.findByText("Page 1: 1, 2")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Next page" }));

    expect(await screen.findByText("Page 2 (loading): 1, 2")).toBeOnTheScreen();
    answerSecondPage(pageResponse([API_USER_DETAILS]));
    expect(await screen.findByText("Page 2: 1")).toBeOnTheScreen();
    expect(fetchSpy).toHaveBeenLastCalledWith(expect.stringContaining("_page=2"), expect.anything());
  });

  it("serves a page it already has from the cache without another request", async () => {
    const fetchSpy = answerFetchWith((): Response => pageResponse(API_USERS));
    const queryClient = createClient();
    const first = await renderHook(() => useSampleUsersPage(PAGE_ONE), { wrapper: wrapperFor(queryClient) });
    await waitFor((): void => {
      expect(first.result.current.status).toBe("success");
    });

    const second = await renderHook(() => useSampleUsersPage(PAGE_ONE), { wrapper: wrapperFor(queryClient) });

    expect(second.result.current.data).toEqual(FIRST_PAGE);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("reports a request that keeps failing as an error", async () => {
    answerFetchWith((): Response => jsonResponse({}, SERVER_ERROR));

    const { result } = await renderHook(() => useSampleUsersPage(PAGE_ONE), { wrapper: wrapperFor(createClient()) });

    await waitFor((): void => {
      expect(result.current.status).toBe("error");
    });
  });
});

describe("useSampleUserDetails", () => {
  it("loads one user in full", async () => {
    answerFetchWith((): Response => jsonResponse(API_USER_DETAILS));

    const { result } = await renderHook(() => useSampleUserDetails(1), { wrapper: wrapperFor(createClient()) });

    await waitFor((): void => {
      expect(result.current.status).toBe("success");
    });
    expect(result.current.data).toEqual(PARSED_USER_DETAILS);
  });

  it("requests nothing without an id", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch");

    const { result } = await renderHook(() => useSampleUserDetails(null), { wrapper: wrapperFor(createClient()) });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("retryUnlessNotFound", () => {
  it("retries a server or network failure a few times", () => {
    expect(retryUnlessNotFound(0, new SampleUsersRequestError(SERVER_ERROR))).toBe(true);
    expect(retryUnlessNotFound(0, new TypeError("Network request failed"))).toBe(true);
    expect(retryUnlessNotFound(2, new TypeError("Network request failed"))).toBe(false);
  });

  it("never retries a missing user", () => {
    expect(retryUnlessNotFound(0, new SampleUsersRequestError(NOT_FOUND))).toBe(false);
  });
});
