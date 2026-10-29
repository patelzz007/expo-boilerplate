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

function layout(height: number): {
  readonly nativeEvent: {
    readonly layout: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  };
} {
  return { nativeEvent: { layout: { x: 0, y: 0, width: 390, height } } };
}

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
  it("reports its full height rounded up, and its subtitle line's height (how far it collapses) rounded down", async () => {
    const onHeightChange = jest.fn<undefined, [number]>();
    const onCollapseDistanceChange = jest.fn<undefined, [number]>();
    await renderHeader({ onHeightChange, onCollapseDistanceChange });

    await fireEvent(screen.getByTestId("header"), "layout", layout(138.4));
    await fireEvent(screen.getByTestId("header-subtitle-clip"), "layout", layout(35.2));

    expect(onHeightChange).toHaveBeenCalledWith(139);
    // Rounded down: the bar's edge never rises above the pinned row, so no sliver of the page shows under it.
    expect(onCollapseDistanceChange).toHaveBeenCalledWith(35);
  });

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

  it("turns the bar into the content's surface as it collapses, with no line between the two", async () => {
    await renderHeader({ progress: makeMutable(COLLAPSED), collapseDistance: makeMutable(COLLAPSE_DISTANCE) });

    expect(getAnimatedStyle(screen.getByTestId("header-surface"))).toMatchObject({ opacity: 1 });
    expect(screen.queryByTestId("header-hairline")).toBeNull();
  });

  it("blends part-way into the surface half-way through the collapse", async () => {
    await renderHeader({ progress: makeMutable(HALF_COLLAPSED), collapseDistance: makeMutable(COLLAPSE_DISTANCE) });

    expect(getAnimatedStyle(screen.getByTestId("header-surface"))).toMatchObject({ opacity: HALF_COLLAPSED });
  });

  it("shows the whole header at the top of the page", async () => {
    await renderHeader({ collapseDistance: makeMutable(COLLAPSE_DISTANCE) });

    expect(getAnimatedStyle(screen.getByTestId("header-background"))).toMatchObject({
      transform: [{ translateY: -0 }],
    });
    expect(getAnimatedStyle(screen.getByTestId("header-subtitle"))).toMatchObject({ opacity: 1 });
    expect(getAnimatedStyle(screen.getByTestId("header-surface"))).toMatchObject({ opacity: 0 });
  });
});
