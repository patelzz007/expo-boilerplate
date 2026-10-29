import { z } from "zod";

import {
  defineUrlState,
  FIRST_PAGE,
  formatQueryString,
  InvalidUrlStateDefinitionError,
  isSameQuery,
  optionalBooleanUrlParam,
  optionalUrlParam,
  pageUrlParam,
  readSearchParam,
  toUrlSearchParams,
  urlParamWithDefault,
} from "../url-state";

const STATUS = z.enum(["active", "locked"]);
const SORT = z.enum(["name", "email"]);

const LIST_URL_STATE = defineUrlState(
  {
    page: pageUrlParam(),
    sort: urlParamWithDefault(SORT, "name"),
    status: optionalUrlParam(STATUS),
    archived: optionalBooleanUrlParam(),
  },
  { urlKeys: { status: "filter[status]" } }
);

describe("defineUrlState", () => {
  it("opens on every param's default when the URL carries none", () => {
    expect(LIST_URL_STATE.defaults).toEqual({ page: FIRST_PAGE, sort: "name", status: undefined, archived: undefined });
    expect(LIST_URL_STATE.parse(new URLSearchParams())).toEqual(LIST_URL_STATE.defaults);
  });

  it("parses each param it owns, under its URL key", () => {
    expect(LIST_URL_STATE.parse(new URLSearchParams("page=3&sort=email&filter[status]=locked&archived=true"))).toEqual({
      page: 3,
      sort: "email",
      status: "locked",
      archived: true,
    });
  });

  it("reads a screen's params record as well as URLSearchParams", () => {
    expect(LIST_URL_STATE.parse({ page: "2", "filter[status]": ["active", "locked"], id: "7" })).toMatchObject({
      page: 2,
      status: "active",
    });
  });

  it("falls back per param: one bad value never resets the others", () => {
    expect(LIST_URL_STATE.parse(new URLSearchParams("page=0&sort=email&filter[status]=gone&archived=maybe"))).toEqual({
      page: FIRST_PAGE,
      sort: "email",
      status: undefined,
      archived: undefined,
    });
  });

  it("leaves default values out of the URL, so the default state has no query at all", () => {
    expect(LIST_URL_STATE.serialize(LIST_URL_STATE.defaults)).toBe("");
    expect(LIST_URL_STATE.serialize({ ...LIST_URL_STATE.defaults, page: 2, status: "locked" })).toBe(
      "page=2&filter[status]=locked"
    );
  });

  it("keeps params it does not own", () => {
    expect(
      LIST_URL_STATE.serialize({ ...LIST_URL_STATE.defaults, page: 2 }, new URLSearchParams("tab=billing&page=5"))
    ).toBe("tab=billing&page=2");
  });

  it("builds a link to a state", () => {
    expect(LIST_URL_STATE.href("/", { ...LIST_URL_STATE.defaults, page: 2 })).toBe("/?page=2");
    expect(LIST_URL_STATE.href("/team", LIST_URL_STATE.defaults)).toBe("/team");
  });

  it("round-trips a state through its URL", () => {
    const state: typeof LIST_URL_STATE.defaults = { page: 4, sort: "email", status: "active", archived: false };

    expect(LIST_URL_STATE.parse(new URLSearchParams(LIST_URL_STATE.serialize(state)))).toEqual(state);
  });

  it("rejects two fields that share one URL key", () => {
    expect(() => defineUrlState({ a: pageUrlParam(), b: pageUrlParam() }, { urlKeys: { b: "a" } })).toThrow(
      InvalidUrlStateDefinitionError
    );
  });

  it("rejects a param without a default", () => {
    expect(() => defineUrlState({ status: STATUS })).toThrow(InvalidUrlStateDefinitionError);
  });
});

describe("pageUrlParam", () => {
  it("accepts a positive whole number and falls back to the first page otherwise", () => {
    const pageOf = (raw: string | undefined): number => pageUrlParam().parse(raw);

    expect(pageOf("12")).toBe(12);
    for (const raw of [undefined, "0", "-1", "1.5", "two", "01"]) {
      expect(pageOf(raw)).toBe(FIRST_PAGE);
    }
  });
});

describe("search param helpers", () => {
  it("copies a params record, keeping every value of a repeated key", () => {
    expect(toUrlSearchParams({ tag: ["a", "b"], page: "2", none: undefined }).toString()).toBe("tag=a&tag=b&page=2");
    expect(toUrlSearchParams(undefined).toString()).toBe("");
  });

  it("reads the first value of a param", () => {
    expect(readSearchParam({ tag: ["a", "b"] }, "tag")).toBe("a");
    expect(readSearchParam(new URLSearchParams("page=2"), "missing")).toBeUndefined();
  });

  it("keeps brackets readable and compares queries by content", () => {
    expect(formatQueryString(new URLSearchParams([["filter[status]", "locked"]]))).toBe("filter[status]=locked");
    expect(isSameQuery("filter%5Bstatus%5D=locked", "filter[status]=locked")).toBe(true);
    expect(isSameQuery("page=1", "page=2")).toBe(false);
  });
});
