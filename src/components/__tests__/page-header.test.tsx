import { fireEvent, render, screen } from "@testing-library/react-native";
import * as React from "react";
import { getAnimatedStyle, makeMutable } from "react-native-reanimated";
import { z } from "zod";

import { PAGE_HEADER_ROW_HEIGHT, PageHeader, type PageHeaderProps } from "../page-header";

/** The subtitle line's height: how far the header collapses. */
const COLLAPSE_DISTANCE = 36;
const COLLAPSED = 1;
const HALF_COLLAPSED = 0.5;
const HALF_FADED = 0.5;
/** A tenth of the collapse (under 4 pt of scrolling): the subtitle should still be all but fully there. */
const BARELY_SCROLLED = 0.1;
const MOSTLY_VISIBLE = 0.95;

/** Tailwind's spacing unit: `h-14` is 14 of these. */
const SPACING_UNIT = 4;
const ROW_HEIGHT_CLASS = /\bh-(?<steps>\d+)\b/;

async function renderHeader(props: Partial<PageHeaderProps> = {}): Promise<void> {
  await render(
    <PageHeader
      title="Home"
      subtitle="Your account at a glance"
      titleKey="/"
      titleDrift={0}
      leading="menu"
      onMenu={jest.fn<undefined, []>()}
      onBack={jest.fn<undefined, []>()}
      onNotifications={jest.fn<undefined, []>()}
      topInset={0}
      progress={makeMutable(0)}
      collapseDistance={makeMutable(0)}
      testID="header"
      {...props}
    />
  );
}

describe("PageHeader", () => {
  it("shows the title and subtitle between the menu and notifications", async () => {
    await renderHeader();

    expect(screen.getByRole("header", { name: "Home" })).toBeOnTheScreen();
    expect(screen.getByText("Your account at a glance")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Open menu" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Notifications" })).toBeOnTheScreen();
  });

  it("opens notifications from the bell", async () => {
    const onNotifications = jest.fn<undefined, []>();
    await renderHeader({ onNotifications });

    await fireEvent.press(screen.getByRole("button", { name: "Notifications" }));

    expect(onNotifications).toHaveBeenCalledTimes(1);
  });

  it("draws the controls row exactly PAGE_HEADER_ROW_HEIGHT tall, where the toasts are anchored", async () => {
    await renderHeader();

    const className = z.string().parse(screen.getByTestId("header-controls").props.className);
    const steps = ROW_HEIGHT_CLASS.exec(className)?.groups?.steps;

    expect(Number(steps) * SPACING_UNIT).toBe(PAGE_HEADER_ROW_HEIGHT);
  });

  it("shrinks in place: only the background lifts, the controls stay and the subtitle fades where it is", async () => {
    await renderHeader({ progress: makeMutable(COLLAPSED), collapseDistance: makeMutable(COLLAPSE_DISTANCE) });

    expect(getAnimatedStyle(screen.getByTestId("header-background"))).toMatchObject({
      transform: [{ translateY: -COLLAPSE_DISTANCE }],
    });
    // The subtitle's frame rises with the edge and clips it; the text itself is held where it was.
    expect(getAnimatedStyle(screen.getByTestId("header-subtitle-clip"))).toMatchObject({
      transform: [{ translateY: -COLLAPSE_DISTANCE }],
    });
    expect(getAnimatedStyle(screen.getByTestId("header-subtitle"))).toMatchObject({
      opacity: 0,
      transform: [{ translateY: COLLAPSE_DISTANCE }],
    });
    // Nothing that holds the controls moves.
    expect(screen.getByTestId("header")).toHaveStyle({ paddingTop: 0 });
    expect(screen.getByTestId("header-controls").props.style).toBeUndefined();
  });

  it("fades the subtitle on an ease: half collapsed is half faded, and the first points of a scroll barely touch it", async () => {
    await renderHeader({ progress: makeMutable(HALF_COLLAPSED), collapseDistance: makeMutable(COLLAPSE_DISTANCE) });
    expect(getAnimatedStyle(screen.getByTestId("header-subtitle"))).toMatchObject({ opacity: HALF_FADED });

    await renderHeader({ progress: makeMutable(BARELY_SCROLLED), collapseDistance: makeMutable(COLLAPSE_DISTANCE) });
    const { opacity } = z
      .object({ opacity: z.number() })
      .parse(getAnimatedStyle(screen.getByTestId("header-subtitle")));
    expect(opacity).toBeGreaterThan(MOSTLY_VISIBLE);
  });

  it("shows the whole header at the top of the page", async () => {
    await renderHeader({ collapseDistance: makeMutable(COLLAPSE_DISTANCE) });

    expect(getAnimatedStyle(screen.getByTestId("header-background"))).toMatchObject({
      transform: [{ translateY: -0 }],
    });
    expect(getAnimatedStyle(screen.getByTestId("header-subtitle"))).toMatchObject({ opacity: 1 });
  });
});
