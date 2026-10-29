import { screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import * as React from "react";
import { SafeAreaProvider, type Metrics } from "react-native-safe-area-context";
import { z } from "zod";

import { BodyText } from "@/ui/components/text";

import { PageHeaderClearanceProvider } from "../../lib/page-header-clearance";
import { pageHeaderControlsBottom } from "../page-header";
import { Screen } from "../screen";

/** The pull-to-refresh control a scroll view was given (Jest's scroll view does not render it): only the offset is read. */
const RefreshControlElementSchema = z.object({ props: z.object({ progressViewOffset: z.number().optional() }) });

function refreshOffsetOf(testID: string): number | undefined {
  return RefreshControlElementSchema.parse(screen.getByTestId(testID).props.refreshControl).props.progressViewOffset;
}

/** A phone-sized frame: SafeAreaProvider renders nothing until it knows the metrics. */
const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** The app shell's header, status bar included, in these tests: its pinned row and a subtitle line. */
const HEADER_HEIGHT = 123;
/** Where the header's pinned row ends on this frame: a scrolling screen starts there. */
const PINNED_ROW_BOTTOM = pageHeaderControlsBottom(METRICS.insets.top);
/** The rest of the header, its subtitle line: padding inside the scroll view, so the content starts below the header. */
const SUBTITLE_LINE = HEADER_HEIGHT - PINNED_ROW_BOTTOM;

/**
 * Every Screen is a route in the app, and it reads the router (its focus feeds the page header's
 * scroll link, src/lib/page-header-scroll.tsx), so these tests render it as one.
 */
async function renderScreen(element: React.JSX.Element): Promise<void> {
  await renderRouter({ index: (): React.JSX.Element => element }, { initialUrl: "/" });
}

describe("Screen", () => {
  it("under the app shell's header, leaves the title to the header and starts its content below it", async () => {
    await renderScreen(
      <SafeAreaProvider initialMetrics={METRICS}>
        <PageHeaderClearanceProvider value={HEADER_HEIGHT}>
          <Screen title="Home" description="Your account at a glance" testID="screen">
            <BodyText>Content</BodyText>
          </Screen>
        </PageHeaderClearanceProvider>
      </SafeAreaProvider>
    );

    expect(screen.queryByRole("header")).toBeNull();
    expect(screen.getByText("Your account at a glance")).toBeOnTheScreen();
    expect(screen.getByTestId("screen-content")).toHaveProp("contentContainerStyle", { paddingTop: SUBTITLE_LINE });
    expect(screen.getByTestId("screen-content")).toHaveProp("scrollIndicatorInsets", { top: SUBTITLE_LINE, bottom: 0 });
  });

  it("under the app shell's header, starts its scroll view below the header's pinned row, so the scrollbar runs along the content", async () => {
    await renderScreen(
      <SafeAreaProvider initialMetrics={METRICS}>
        <PageHeaderClearanceProvider value={HEADER_HEIGHT}>
          <Screen testID="screen">
            <BodyText>Content</BodyText>
          </Screen>
        </PageHeaderClearanceProvider>
      </SafeAreaProvider>
    );

    expect(screen.getByTestId("screen-content")).toHaveStyle({ marginTop: PINNED_ROW_BOTTOM });
    expect(PINNED_ROW_BOTTOM + SUBTITLE_LINE).toBe(HEADER_HEIGHT);
  });

  it("outside the shell, shows its own title and starts at the top", async () => {
    await renderScreen(
      <SafeAreaProvider initialMetrics={METRICS}>
        <Screen title="Locked" testID="screen">
          <BodyText>Content</BodyText>
        </Screen>
      </SafeAreaProvider>
    );

    expect(screen.getByRole("header", { name: "Locked" })).toBeOnTheScreen();
    expect(screen.getByTestId("screen-content")).toHaveStyle({ marginTop: 0 });
    expect(screen.getByTestId("screen-content")).toHaveProp("scrollIndicatorInsets", { top: 0, bottom: 0 });
  });

  it("without scrolling, fills the screen below the app shell's header with its content", async () => {
    await renderScreen(
      <SafeAreaProvider initialMetrics={METRICS}>
        <PageHeaderClearanceProvider value={HEADER_HEIGHT}>
          <Screen scrollable={false} description="A document" testID="screen">
            <BodyText>Pages</BodyText>
          </Screen>
        </PageHeaderClearanceProvider>
      </SafeAreaProvider>
    );

    const content = screen.getByTestId("screen-content");
    expect(content).toHaveStyle({ paddingTop: HEADER_HEIGHT });
    expect(content).not.toHaveProp("contentContainerStyle");
    expect(screen.getByText("Pages")).toBeOnTheScreen();
  });

  it("drops the pull-to-refresh spinner below the app shell's header, where the content starts", async () => {
    await renderScreen(
      <SafeAreaProvider initialMetrics={METRICS}>
        <PageHeaderClearanceProvider value={HEADER_HEIGHT}>
          <Screen onRefresh={jest.fn()} testID="screen">
            <BodyText>Content</BodyText>
          </Screen>
        </PageHeaderClearanceProvider>
      </SafeAreaProvider>
    );

    expect(refreshOffsetOf("screen-content")).toBe(SUBTITLE_LINE);
  });
});
