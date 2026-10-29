import { DYNAMIC_ROUTES } from "../../../runtime/routes";
import { teamMemberHref, teamMemberIdOf } from "../team-member-route";

describe("teamMemberIdOf", () => {
  it("reads a positive whole-number id", () => {
    expect(teamMemberIdOf({ id: "3" })).toBe(3);
    expect(teamMemberIdOf({ id: "10" })).toBe(10);
  });

  it("names no id for anything else", () => {
    expect(teamMemberIdOf({})).toBeNull();
    expect(teamMemberIdOf({ id: "0" })).toBeNull();
    expect(teamMemberIdOf({ id: "-1" })).toBeNull();
    expect(teamMemberIdOf({ id: "1.5" })).toBeNull();
    expect(teamMemberIdOf({ id: "abc" })).toBeNull();
    expect(teamMemberIdOf({ id: ["1", "2"] })).toBeNull();
  });
});

describe("teamMemberHref", () => {
  it("points at the team member route with the id as its param", () => {
    expect(teamMemberHref(7)).toEqual({ pathname: DYNAMIC_ROUTES.teamMember, params: { id: "7" } });
  });
});
