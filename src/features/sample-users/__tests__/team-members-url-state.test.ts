import { FIRST_PAGE } from "../../../lib/url-state/url-state";
import { TEAM_MEMBERS_URL_STATE } from "../team-members-url-state";

describe("TEAM_MEMBERS_URL_STATE", () => {
  it("opens the list on the page the URL names", () => {
    expect(TEAM_MEMBERS_URL_STATE.parse({ page: "3" })).toEqual({ page: 3 });
  });

  it("opens the first page for an absent or malformed page", () => {
    for (const page of [undefined, "0", "-2", "two"]) {
      expect(TEAM_MEMBERS_URL_STATE.parse({ page })).toEqual({ page: FIRST_PAGE });
    }
  });

  it("links to a page, leaving the first page's URL clean", () => {
    expect(TEAM_MEMBERS_URL_STATE.href("/", { page: 2 })).toBe("/?page=2");
    expect(TEAM_MEMBERS_URL_STATE.href("/", { page: FIRST_PAGE })).toBe("/");
  });
});
