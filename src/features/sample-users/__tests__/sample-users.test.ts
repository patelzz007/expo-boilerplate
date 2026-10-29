import { ZodError } from "zod";

import { fetchSampleUsers, SAMPLE_USERS_URL, SampleUsersRequestError } from "../sample-users";
import { API_USERS, jsonResponse, PARSED_USERS } from "./sample-users-responses";

const NOT_FOUND = 404;
const SERVER_ERROR = 500;

describe("fetchSampleUsers", () => {
  it("requests the users endpoint with the caller's abort signal", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(API_USERS));
    const controller = new AbortController();

    await fetchSampleUsers(controller.signal);

    expect(fetchSpy).toHaveBeenCalledWith(SAMPLE_USERS_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
  });

  it("parses the users and keeps only the fields the list shows", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(API_USERS));

    await expect(fetchSampleUsers(new AbortController().signal)).resolves.toEqual(PARSED_USERS);
  });

  it("rejects with the status when the API answers with an error", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, SERVER_ERROR));

    const failure = fetchSampleUsers(new AbortController().signal);

    await expect(failure).rejects.toBeInstanceOf(SampleUsersRequestError);
    await expect(failure).rejects.toMatchObject({ status: SERVER_ERROR });
  });

  it("rejects a 404 without reading the body", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(API_USERS, NOT_FOUND));

    await expect(fetchSampleUsers(new AbortController().signal)).rejects.toMatchObject({ status: NOT_FOUND });
  });

  it("rejects a body that is not a list of users", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ users: API_USERS }));

    await expect(fetchSampleUsers(new AbortController().signal)).rejects.toBeInstanceOf(ZodError);
  });

  it("rejects a user without a valid email", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(API_USERS.map((user) => ({ ...user, email: "not-an-email" }))));

    await expect(fetchSampleUsers(new AbortController().signal)).rejects.toBeInstanceOf(ZodError);
  });

  it("passes on a network failure", async () => {
    const offline = new TypeError("Network request failed");
    jest.spyOn(globalThis, "fetch").mockRejectedValue(offline);

    await expect(fetchSampleUsers(new AbortController().signal)).rejects.toBe(offline);
  });
});
