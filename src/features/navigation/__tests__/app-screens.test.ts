import { ROUTES } from "../../../runtime/routes";
import { SAMPLE_USER_DETAILS_SUBTITLE, SAMPLE_USER_DETAILS_TITLE } from "../../sample-users/labels";
import { screenHeadingOf } from "../app-screens";
import { isTabRoot } from "../drawer-destinations";
import { headerTitleDriftOf } from "../header-transition";

describe("screenHeadingOf", () => {
  it("names a tab and a fixed sub-screen by their path", () => {
    expect(screenHeadingOf(ROUTES.home)).toEqual({ title: "Home", subtitle: "Your account at a glance" });
    expect(screenHeadingOf(ROUTES.security).title).toBe("Security");
  });

  it("names a team member's screen whatever their id", () => {
    const teamMember = { title: SAMPLE_USER_DETAILS_TITLE, subtitle: SAMPLE_USER_DETAILS_SUBTITLE };

    expect(screenHeadingOf("/team/3")).toEqual(teamMember);
    expect(screenHeadingOf("/team/10")).toEqual(teamMember);
  });

  it("names nothing for a path the app does not have", () => {
    expect(screenHeadingOf("/team")).toEqual({ title: "", subtitle: "" });
    expect(screenHeadingOf("/team/3/extra")).toEqual({ title: "", subtitle: "" });
  });
});

describe("a team member's screen", () => {
  it("is deeper than Home, so it leads with back and comes in from the right", () => {
    expect(isTabRoot(ROUTES.home)).toBe(true);
    expect(isTabRoot("/team/3")).toBe(false);
    expect(headerTitleDriftOf(ROUTES.home, "/team/3")).toBeGreaterThan(0);
    expect(headerTitleDriftOf("/team/3", ROUTES.home)).toBeLessThan(0);
  });
});
