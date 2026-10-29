import { ZodError } from "zod";

import {
  fetchSampleUserDetails,
  fetchSampleUsersPage,
  isUserNotFound,
  SAMPLE_USERS_URL,
  SampleUsersRequestError,
} from "../sample-users";
import {
  API_USER_DETAILS,
  API_USERS,
  jsonResponse,
  pageResponse,
  PARSED_USER_DETAILS,
  PARSED_USERS,
  TOTAL_USERS,
} from "./sample-users-responses";

const NOT_FOUND = 404;
const SERVER_ERROR = 500;
const SECOND_PAGE = { page: 2, pageSize: 4 };

function signal(): AbortSignal {
  return new AbortController().signal;
}

describe("fetchSampleUsersPage", () => {
  it("asks for the page and its size, with the caller's abort signal", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(pageResponse(API_USERS));
    const controller = new AbortController();

    await fetchSampleUsersPage(SECOND_PAGE, controller.signal);

    expect(fetchSpy).toHaveBeenCalledWith(`${SAMPLE_USERS_URL}?_page=2&_limit=4`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
  });

  it("parses the users, keeping only the fields the list shows, and the total from the header", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(pageResponse(API_USERS));

    await expect(fetchSampleUsersPage(SECOND_PAGE, signal())).resolves.toEqual({
      users: PARSED_USERS,
      total: TOTAL_USERS,
    });
  });

  it("rejects with the status when the API answers with an error", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, SERVER_ERROR));

    const failure = fetchSampleUsersPage(SECOND_PAGE, signal());

    await expect(failure).rejects.toBeInstanceOf(SampleUsersRequestError);
    await expect(failure).rejects.toMatchObject({ status: SERVER_ERROR, isClientError: false });
  });

  it("rejects a body that is not a list of users", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(pageResponse({ users: API_USERS }));

    await expect(fetchSampleUsersPage(SECOND_PAGE, signal())).rejects.toBeInstanceOf(ZodError);
  });

  it("rejects a user without a valid email", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(pageResponse(API_USERS.map((user) => ({ ...user, email: "not-an-email" }))));

    await expect(fetchSampleUsersPage(SECOND_PAGE, signal())).rejects.toBeInstanceOf(ZodError);
  });

  it("rejects a page without the total-count header", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(API_USERS));

    await expect(fetchSampleUsersPage(SECOND_PAGE, signal())).rejects.toBeInstanceOf(ZodError);
  });

  it("passes on a network failure", async () => {
    const offline = new TypeError("Network request failed");
    jest.spyOn(globalThis, "fetch").mockRejectedValue(offline);

    await expect(fetchSampleUsersPage(SECOND_PAGE, signal())).rejects.toBe(offline);
  });
});

describe("fetchSampleUserDetails", () => {
  it("asks for the one user and parses them in full", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(API_USER_DETAILS));

    await expect(fetchSampleUserDetails(1, signal())).resolves.toEqual(PARSED_USER_DETAILS);
    expect(fetchSpy).toHaveBeenCalledWith(`${SAMPLE_USERS_URL}/1`, expect.anything());
  });

  it("reports an unknown id as not found", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, NOT_FOUND));

    const error = await fetchSampleUserDetails(99, signal()).then(
      (): null => null,
      (failure: Error): Error => failure
    );

    expect(isUserNotFound(error)).toBe(true);
  });

  it("rejects a user missing their address", async () => {
    // JSON leaves an undefined field out: the body has no address.
    jest.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ ...API_USER_DETAILS, address: undefined }));

    await expect(fetchSampleUserDetails(1, signal())).rejects.toBeInstanceOf(ZodError);
  });
});

describe("isUserNotFound", () => {
  it("is true for a client error only", () => {
    expect(isUserNotFound(new SampleUsersRequestError(NOT_FOUND))).toBe(true);
    expect(isUserNotFound(new SampleUsersRequestError(SERVER_ERROR))).toBe(false);
    expect(isUserNotFound(new TypeError("Network request failed"))).toBe(false);
    expect(isUserNotFound(null)).toBe(false);
  });
});
