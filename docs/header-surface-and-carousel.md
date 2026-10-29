# Header surface on scroll & the generic Carousel

Two changes, written so they can be applied as they are to the turborepo starter kit
(`nestjs-nextjs-turborepo-starter-kit`) and keep the two codebases the same. Every snippet below is the current source,
copied from the file; app code is shown with the starter kit's imports (`@workspace/ui-native/…` where this repo
uses `@/ui/…`). Kit files (`packages/ui-native/src/…` there, `src/ui/…` here) use relative imports and drop in as
they are.

| # | Change | Files | Where in the starter kit | Kind |
|---|---|---|---|---|
| A | The collapsed header takes on the content's surface, with a hairline — no dark band over a lighter page in the dark and Nord themes | `components/page-header.tsx`, its test | `apps/mobile/src/components/` | edit |
| B1 | `Carousel` gains `peek`, `gap` and `autoPlayIntervalMs` (generic, backwards compatible) | `components/carousel.tsx`, its test | `packages/ui-native/src/components/` | edit |
| B2 | A "Discover" carousel on Home, built on it | `features/home-highlights/*`, Home screen | `apps/mobile/src/` | **new** + edit |

After pasting, format (`pnpm --filter <package> run format` — the starter kit indents with tabs, the snippets here
use spaces), then run the gate: `lint`, `typecheck`, `test`.

> **This file stands alone.** `docs/mobile-shell-porting-guide.md` is left as it was: its `page-header.tsx` block
> predates part A, so take the header from **this** file.

> **Prerequisite for A:** the header in the starter kit must first have the "shrink in place" structure (a separate
> background layer that moves, a clipped subtitle) — `docs/mobile-shell-porting-guide.md`, sections 1–3. The full
> `page-header.tsx` below already contains all of it, so replacing the file brings both.

---

## A. Header surface on scroll

### The problem

At the top of a page the header is the page's colour (`bg-background`) and the content sits on a raised sheet
(`bg-card`) with a curved top. Scrolling, the sheet slides **under** the header — so the collapsed bar stayed the page
colour while the content passing beneath it was the card colour, meeting at a hard flat edge:

| Theme | `--background` (header) | `--card` (content) | Result before |
|---|---|---|---|
| light | `#f1f4f9` | `oklch(0.985 0.003 258)` | barely visible — fine |
| dark | `oklch(0.225 0.015 258)` | `oklch(0.275 0.017 258)` | a dark band over a lighter page |
| nord | `#2e3440` | `#3b4252` | a dark band over a lighter page |

### The fix

The pattern of Material 3's scrolled top app bar: once content scrolls under the bar, the bar takes on the content's
surface. Two layers inside the header's moving background:

| Layer | Classes | Animated | Meaning |
|---|---|---|---|
| surface | `absolute inset-0 bg-card` | `opacity = progress` | the bar blends from the page colour into the content's surface as it collapses |
| hairline | `absolute inset-x-0 bottom-0 h-px bg-border` | `opacity` 0 → 1 over `progress` 0.75 → 1 | marks where the content passes under, once it does |

Both are theme tokens — no colour literals, no per-theme code, no colour interpolation (Reanimated can't interpolate
`oklch()`, and the token values are not readable as numbers anyway): one opacity cross-fade between two token-coloured
layers works for every theme, including ones added later. Both live inside the background layer, so they move with it
and cover the status bar area too. At the top of a page nothing changes (`progress` 0: surface and hairline at 0).

```tsx
// Inside the PageHeader component
const surfaceStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
const hairlineStyle = useAnimatedStyle(() => ({
  opacity: interpolate(progress.get(), [HAIRLINE_FADE_START, FULLY_COLLAPSED], [HIDDEN, VISIBLE], Extrapolation.CLAMP),
}));

<StyledAnimatedView pointerEvents="none" className="absolute inset-0 bg-background" style={backgroundStyle}>
  <StyledAnimatedView className="absolute inset-0 bg-card" style={surfaceStyle} />
  <StyledAnimatedView className="absolute inset-x-0 bottom-0 h-px bg-border" style={hairlineStyle} />
</StyledAnimatedView>
```

### `components/page-header.tsx` (replace)

```tsx
// The page header, on the page's own colour like the status bar above it (the app draws edge to
// edge, as the starter kit does). It has two parts:
//
// - the pinned row — the leading control (the menu, or back) on the left, the notifications button on
//   the right and, centred between them, the page's title. The row never moves.
// - the subtitle line — centred under the title, between the two buttons.
//
// As the page scrolls (`progress` 0 → 1, src/lib/page-header-scroll.tsx) the header shrinks in place:
// its background pulls up from the bottom edge, so the content's curved top stays attached to it, and
// the subtitle stays where it is, fading gently while the rising edge tucks it away. Nothing in the
// header slides with the content: what is left is one slim bar with the menu, the title and
// notifications, exactly where they were.
//
// The bar takes on the content's surface as it collapses: at the top the header is the page's colour
// (`bg-background`) and the content a raised sheet (`bg-card`) under it; collapsed, the content runs
// under the bar, so the bar becomes that same surface, with a hairline (`border-border`) to mark where
// the content passes beneath — not a darker band over a lighter page, which the dark and Nord themes
// (where the two colours are far apart) made look broken.
//
// It is rendered once by the app shell for every signed-in screen — screens never draw their own header.
// Presentational and controlled: the caller gives the title, subtitle, which control leads and what each
// control does. A new `titleKey` brings the new title in from `titleDrift` points away while the old one
// leaves the other way (the page transition's timing), and the leading control cross-fades when it
// changes. All of it follows the OS "Reduce Motion" setting.

import ArrowLeftIcon from "lucide-react-native/icons/arrow-left";
import BellIcon from "lucide-react-native/icons/bell";
import MenuIcon from "lucide-react-native/icons/menu";
import * as React from "react";
import { Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
  type LayoutAnimation,
  type SharedValue,
} from "react-native-reanimated";
import { withUniwind } from "uniwind";

import { Icon, type LucideIcon } from "@workspace/ui-native/components/icon";
import { CONTROL_SWAP_MS, PAGE_TITLE_TIMING } from "@workspace/ui-native/lib/motion";

const StyledAnimatedView = withUniwind(Animated.View);

/**
 * The header's height below the status bar before it has been measured: the pinned row (`h-14`) and
 * the subtitle line (`text-sm`, `pb-4`). The shell replaces it with the measured height on the first layout.
 */
export const PAGE_HEADER_ESTIMATED_HEIGHT = 92;

/**
 * The pinned row's height below the status bar (`h-14`: keep the two in step). The row never moves,
 * expanded or collapsed, so anything anchored to the header's controls (the toasts) sits under it.
 */
export const PAGE_HEADER_ROW_HEIGHT = 56;

const HIDDEN = 0;
const VISIBLE = 1;
const AT_REST = 0;
/**
 * How the subtitle fades across the collapse: slowly at first, then away — an ease, not a straight line,
 * so the first few points of a scroll barely touch it. It runs over the whole collapse: the rising
 * background edge clips the line as it goes, so the text never shows over the content.
 */
const SUBTITLE_FADE = Easing.inOut(Easing.quad);

/** The hairline under the collapsed bar appears over the last part of the collapse, as the content reaches it. */
const HAIRLINE_FADE_START = 0.75;
const FULLY_COLLAPSED = 1;

export type PageHeaderLeading = "menu" | "back";

export interface PageHeaderProps {
  /** The page's title, read by screen readers as the page heading. */
  readonly title: string;
  /** One line under the title saying what the page is for. */
  readonly subtitle: string;
  /** Identifies the page: a new key moves the title; the same key with a new title just updates the text. */
  readonly titleKey: string;
  /** Where the incoming title starts, in points: positive from the right, negative from the left. */
  readonly titleDrift: number;
  readonly leading: PageHeaderLeading;
  readonly onMenu: () => void;
  readonly onBack: () => void;
  readonly onNotifications: () => void;
  /** The status bar's height: the band's colour runs up behind it. */
  readonly topInset: number;
  /** 0 expanded … 1 collapsed, from the page's scroll position. */
  readonly progress: SharedValue<number>;
  /** How far the header collapses: the subtitle line's height. */
  readonly collapseDistance: SharedValue<number>;
  /** Reports the header's full expanded height (status bar included), so screens start their content below it. */
  readonly onHeightChange?: (height: number) => void;
  /** Reports the subtitle line's height: how far the page scrolls while the header collapses. */
  readonly onCollapseDistanceChange?: (distance: number) => void;
  readonly testID?: string;
}

interface TitleSlot {
  readonly key: string;
  readonly title: string;
  readonly subtitle: string;
}

interface TitleSlots {
  readonly current: TitleSlot;
  /** The title leaving after a page change, until the next one replaces it. */
  readonly leaving: TitleSlot | null;
  readonly drift: number;
}

/** The incoming title: from `drift` points away and transparent, to its place. */
function titleEntering(drift: number): () => LayoutAnimation {
  return (): LayoutAnimation => {
    "worklet";
    return {
      initialValues: { opacity: HIDDEN, transform: [{ translateX: drift }] },
      animations: {
        opacity: withTiming(VISIBLE, PAGE_TITLE_TIMING),
        transform: [{ translateX: withTiming(AT_REST, PAGE_TITLE_TIMING) }],
      },
    };
  };
}

/**
 * The outgoing title, mounted afresh as its own element so it leaves in the NEW page's direction
 * (an `exiting` animation would keep the one it was rendered with): from its place to `-drift`, fading out.
 */
function titleLeaving(drift: number): () => LayoutAnimation {
  return (): LayoutAnimation => {
    "worklet";
    return {
      initialValues: { opacity: VISIBLE, transform: [{ translateX: AT_REST }] },
      animations: {
        opacity: withTiming(HIDDEN, PAGE_TITLE_TIMING),
        transform: [{ translateX: withTiming(-drift, PAGE_TITLE_TIMING) }],
      },
    };
  };
}

const CONTROL_IN = FadeIn.duration(CONTROL_SWAP_MS).reduceMotion(ReduceMotion.System);
const CONTROL_OUT = FadeOut.duration(CONTROL_SWAP_MS).reduceMotion(ReduceMotion.System);

export function PageHeader({
  title,
  subtitle,
  titleKey,
  titleDrift,
  leading,
  onMenu,
  onBack,
  onNotifications,
  topInset,
  progress,
  collapseDistance,
  onHeightChange,
  onCollapseDistanceChange,
  testID,
}: PageHeaderProps): React.JSX.Element {
  const [slots, setSlots] = React.useState<TitleSlots>({
    current: { key: titleKey, title, subtitle },
    leaving: null,
    drift: titleDrift,
  });
  if (slots.current.key !== titleKey) {
    // A page change: adjusting state to the new props during render (React's documented pattern).
    setSlots({ current: { key: titleKey, title, subtitle }, leaving: slots.current, drift: titleDrift });
  } else if (slots.current.title !== title || slots.current.subtitle !== subtitle) {
    setSlots({ ...slots, current: { key: titleKey, title, subtitle } });
  }
  const topInsetStyle = React.useMemo((): { readonly paddingTop: number } => ({ paddingTop: topInset }), [topInset]);
  const reportHeight = React.useCallback(
    (event: LayoutChangeEvent): void => {
      onHeightChange?.(Math.ceil(event.nativeEvent.layout.height));
    },
    [onHeightChange]
  );
  const reportCollapseDistance = React.useCallback(
    (event: LayoutChangeEvent): void => {
      onCollapseDistanceChange?.(Math.ceil(event.nativeEvent.layout.height));
    },
    [onCollapseDistanceChange]
  );

  // Only the background moves: its bottom edge rises by the subtitle line's height as the header
  // collapses (a transform, so the header's layout — and the content's clearance — never change).
  const backgroundStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -progress.get() * collapseDistance.get() }],
  }));
  // The bar turns into the content's surface as the content slides under it.
  const surfaceStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const hairlineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.get(),
      [HAIRLINE_FADE_START, FULLY_COLLAPSED],
      [HIDDEN, VISIBLE],
      Extrapolation.CLAMP
    ),
  }));
  // The subtitle line's frame rises with the background's edge and clips the text, which is held in
  // place by an equal and opposite shift: the edge passes over a still line, tucking it away.
  const subtitleClipStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -progress.get() * collapseDistance.get() }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: VISIBLE - SUBTITLE_FADE(progress.get()),
    transform: [{ translateY: progress.get() * collapseDistance.get() }],
  }));
  const animates = slots.drift !== AT_REST;

  return (
    <View
      pointerEvents="box-none"
      onLayout={reportHeight}
      className="absolute inset-x-0 top-0"
      style={topInsetStyle}
      testID={testID}>
      {/* The header's colour, status bar included: it rises from below as the header collapses, and
          turns into the content's surface, with a hairline along its bottom edge, as it does. */}
      <StyledAnimatedView
        pointerEvents="none"
        className="absolute inset-0 bg-background"
        style={backgroundStyle}
        testID={testID === undefined ? undefined : `${testID}-background`}>
        <StyledAnimatedView
          className="absolute inset-0 bg-card"
          style={surfaceStyle}
          testID={testID === undefined ? undefined : `${testID}-surface`}
        />
        <StyledAnimatedView
          className="absolute inset-x-0 bottom-0 h-px bg-border"
          style={hairlineStyle}
          testID={testID === undefined ? undefined : `${testID}-hairline`}
        />
      </StyledAnimatedView>
      <View pointerEvents="box-none" className="px-3">
        <View
          pointerEvents="box-none"
          className="h-14 flex-row items-center gap-2"
          testID={testID === undefined ? undefined : `${testID}-controls`}>
          <View className="size-11">
            {leading === "menu" ? (
              <StyledAnimatedView key="menu" entering={CONTROL_IN} exiting={CONTROL_OUT} className="absolute inset-0">
                <HeaderIconButton
                  icon={MenuIcon}
                  accessibilityLabel="Open menu"
                  onPress={onMenu}
                  testID={testID === undefined ? undefined : `${testID}-menu`}
                />
              </StyledAnimatedView>
            ) : (
              <StyledAnimatedView key="back" entering={CONTROL_IN} exiting={CONTROL_OUT} className="absolute inset-0">
                <HeaderIconButton
                  icon={ArrowLeftIcon}
                  accessibilityLabel="Back"
                  onPress={onBack}
                  testID={testID === undefined ? undefined : `${testID}-back`}
                />
              </StyledAnimatedView>
            )}
          </View>
          <View pointerEvents="none" className="h-11 flex-1 justify-center overflow-hidden">
            {slots.leaving === null ? null : (
              <StyledAnimatedView
                key={`leaving:${slots.leaving.key}:${slots.current.key}`}
                entering={titleLeaving(slots.drift)}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                className="absolute inset-x-0 opacity-0">
                <Title title={slots.leaving.title} />
              </StyledAnimatedView>
            )}
            <StyledAnimatedView key={slots.current.key} {...(animates ? { entering: titleEntering(slots.drift) } : {})}>
              <Title title={slots.current.title} testID={testID} />
            </StyledAnimatedView>
          </View>
          <HeaderIconButton
            icon={BellIcon}
            accessibilityLabel="Notifications"
            onPress={onNotifications}
            testID={testID === undefined ? undefined : `${testID}-notifications`}
          />
        </View>
      </View>
      {/* Indented by the buttons' width, so the subtitle sits between them, under the title. */}
      <StyledAnimatedView
        pointerEvents="none"
        onLayout={reportCollapseDistance}
        className="overflow-hidden px-16 pb-4"
        style={subtitleClipStyle}
        testID={testID === undefined ? undefined : `${testID}-subtitle-clip`}>
        <StyledAnimatedView style={subtitleStyle} testID={testID === undefined ? undefined : `${testID}-subtitle`}>
          <StyledAnimatedView key={slots.current.key} {...(animates ? { entering: CONTROL_IN } : {})}>
            <Text numberOfLines={1} className="text-center font-sans text-sm text-muted-foreground">
              {slots.current.subtitle}
            </Text>
          </StyledAnimatedView>
        </StyledAnimatedView>
      </StyledAnimatedView>
    </View>
  );
}

interface TitleProps {
  readonly title: string;
  readonly testID?: string | undefined;
}

function Title({ title, testID }: TitleProps): React.JSX.Element {
  return (
    <Text
      accessibilityRole="header"
      numberOfLines={1}
      className="text-center font-heading text-xl text-foreground"
      testID={testID === undefined ? undefined : `${testID}-title`}>
      {title}
    </Text>
  );
}

interface HeaderIconButtonProps {
  readonly icon: LucideIcon;
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
  readonly testID: string | undefined;
}

/** A 44 pt round icon button with no resting fill — a press shows a soft circle (as the starter kit's). */
function HeaderIconButton({ icon, accessibilityLabel, onPress, testID }: HeaderIconButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={4}
      testID={testID}
      className="size-11 items-center justify-center rounded-full active:bg-muted">
      <Icon icon={icon} size="md" colorClassName="accent-foreground" />
    </Pressable>
  );
}
```

### `components/__tests__/page-header.test.tsx` (replace)

The header test file: layout, the bell, the controls row's height (where toasts anchor), the shrink-in-place motion,
the eased subtitle fade, and — new — the surface and hairline at full and half collapse.

```tsx
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

  it("turns the bar into the content's surface, edged by a hairline, as it collapses", async () => {
    await renderHeader({ progress: makeMutable(COLLAPSED), collapseDistance: makeMutable(COLLAPSE_DISTANCE) });

    expect(getAnimatedStyle(screen.getByTestId("header-surface"))).toMatchObject({ opacity: 1 });
    expect(getAnimatedStyle(screen.getByTestId("header-hairline"))).toMatchObject({ opacity: 1 });
  });

  it("blends part-way into the surface, with no hairline yet, half-way through the collapse", async () => {
    await renderHeader({ progress: makeMutable(HALF_COLLAPSED), collapseDistance: makeMutable(COLLAPSE_DISTANCE) });

    expect(getAnimatedStyle(screen.getByTestId("header-surface"))).toMatchObject({ opacity: HALF_COLLAPSED });
    expect(getAnimatedStyle(screen.getByTestId("header-hairline"))).toMatchObject({ opacity: 0 });
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
```

---

## B1. The generic `Carousel` — `components/carousel.tsx` (kit)

The kit's `Carousel` (a port of the web kit's) was already generic: any content as `children`, controlled
(`index` / `onChange`), accessible dots and optional arrows. It gains three optional props; with none of them it
behaves exactly as before (full-width pages, `pagingEnabled`, no auto-play), so `ImageCarousel` and every existing use
are unchanged.

### API

| Prop | Type | Default | What it does |
|---|---|---|---|
| `children` | `ReactNode` | — | The slides, one per page. |
| `index` / `onChange` | `number` / `(index) => void` | — | Controlled: the caller owns the slide shown; hears swipes, dots, arrows and auto-play. |
| `slideLabel` | `(position, total) => string` | "Slide 2 of 5" | Each dot's accessible name. |
| `showIndicators` / `showControls` | `boolean` | `true` / `false` | Dots; previous / next arrows. |
| `previousLabel` / `nextLabel` | `string` | "Previous slide" / "Next slide" | The arrows' names. |
| **`peek`** | `number` (points) | `0` | How much of the next slide shows at the edge. `0`: one full-width slide per page. |
| **`gap`** | `number` (points) | `12` (`DEFAULT_CAROUSEL_GAP`) | Space between slides when they peek. |
| **`autoPlayIntervalMs`** | `number \| undefined` | `undefined` | Move on every N ms, wrapping to the first. Off when `undefined`. |
| `variant` / `size` | `"plain" \| "card"` / `"sm" \| "md"` | `"plain"` / `"md"` | Surface; dot size. |

### Behaviour

- **Peek.** Each slide is `width − peek − gap` wide and slides sit `gap` apart, so the next one's first `peek` points
  show. The pager snaps slide by slide (`snapToInterval = slideWidth + gap`, `decelerationRate="fast"`,
  `disableIntervalMomentum` — one slide per fling) instead of `pagingEnabled`. The settled index is
  `round(offsetX / interval)`; the last slide aligns to the right edge and still rounds to its own index. The maths is
  exported and tested: `carouselSlideMetrics(width, peek, gap) → { slideWidth, interval }`.
- **Auto-play.** One timer per slide shown (so a slide always gets the full interval, and a manual change restarts
  it); `nextCarouselIndex` wraps after the last slide. It **stops for good** the moment the person takes over — a
  drag (`onScrollBeginDrag`), a dot or an arrow — and **never runs with Reduce Motion on** (WCAG 2.2.2: moving content
  must be stoppable). It needs at least two slides.
- **Out of sight.** The kit can't know whether its screen is in front, so the caller passes `undefined` while it isn't
  (`useIsFocused()` in the screen): a screen kept mounted under a stack or behind another tab stops moving.
- **Accessibility unchanged.** Only the current slide is exposed to screen readers; each dot is a 44 pt button named by
  `slideLabel`, the current one `selected`.

### Usage

```tsx
const [index, setIndex] = React.useState(0);
const focused = useIsFocused();

<Carousel
  index={index}
  onChange={setIndex}
  peek={32} // optional: 0 (the default) for full-width slides — Home's Discover row passes PEEK = 0
  autoPlayIntervalMs={focused ? 6000 : undefined}
  slideLabel={(position, total) => `Highlight ${position} of ${total}`}
  size="sm">
  {items.map((item) => <MyCard key={item.id} item={item} />)}
</Carousel>
```

Each slide fills its page's height (the row stretches its children); give a card `flex-1` so all cards in a row
are equally tall.

### `components/carousel.tsx` (replace)

```tsx
// Slides side by side, one per page (the web kit's `Carousel`): a horizontal
// paging ScrollView with a row of page dots under it — and, with
// `showControls`, previous / next buttons either side of the dots (the web
// kit's arrows). Controlled: the caller owns which slide shows (`index`) and
// hears every change (`onChange`), from a swipe, a dot or an arrow. Each dot is
// a button named by `slideLabel` ("Slide 2 of 5"), and the current one is
// announced as selected.
//
//   ┌──────────────────────────┐
//   │          slide           │   swipe left / right
//   └──────────────────────────┘
//          ‹  ━━ • • •  ›            dots: the current one a pill; arrows on request
//
// Two options for content carousels (a row of cards on a dashboard):
//   - `peek`: each slide is narrower than the carousel, so the start of the next one shows at the edge
//     (a cue that there is more to swipe); slides sit `gap` apart and snap into place.
//
//       ┌────────────────────┐ ┌───
//       │       slide        │ │ ne…      ← `peek` points of the next slide
//       └────────────────────┘ └───
//
//   - `autoPlayIntervalMs`: moves on to the next slide on its own, back to the first after the last. It
//     stops for good the moment the person takes over (a swipe, a dot or an arrow), and never runs with
//     the OS "Reduce Motion" setting on — moving content must be stoppable (WCAG 2.2.2). The caller turns
//     it off while the screen is out of sight (pass `undefined`).

import { cva, type VariantProps } from "class-variance-authority";
import ChevronLeftIcon from "lucide-react-native/icons/chevron-left";
import ChevronRightIcon from "lucide-react-native/icons/chevron-right";
import * as React from "react";
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  View,
  type ViewInstance,
} from "react-native";

import { cn } from "../lib/cn";
import { useReduceMotion } from "../lib/use-reduce-motion";
import { IconButton } from "./icon-button";

export const carouselVariants = cva("w-full", {
  variants: {
    /** `plain`: slides straight on the page. `card`: slides inside a bordered card surface. */
    variant: {
      plain: "",
      card: "overflow-hidden rounded-xl border border-border bg-card pb-1",
    },
    /** The page dots' size, and the space above them. */
    size: {
      sm: "gap-1",
      md: "gap-2",
    },
  },
  defaultVariants: { variant: "plain", size: "md" },
});

export const carouselDotVariants = cva("rounded-full", {
  variants: {
    size: {
      sm: "h-1.5",
      md: "h-2",
    },
    selected: {
      true: "bg-primary",
      false: "bg-border",
    },
  },
  compoundVariants: [
    { size: "sm", selected: false, className: "w-1.5" },
    { size: "sm", selected: true, className: "w-4" },
    { size: "md", selected: false, className: "w-2" },
    { size: "md", selected: true, className: "w-6" },
  ],
  defaultVariants: { size: "md", selected: false },
});

type CarouselVariantProps = VariantProps<typeof carouselVariants>;
export type CarouselVariant = NonNullable<CarouselVariantProps["variant"]>;
export type CarouselSize = NonNullable<CarouselVariantProps["size"]>;

/** A slide's position counts from one for people ("Slide 1 of 5"); indexes count from zero. */
const POSITION_OFFSET = 1;
const FIRST_INDEX = 0;
/** No peek: one full-width slide per page. */
const NO_PEEK = 0;
/** Points between slides when they peek, unless the caller says otherwise. */
export const DEFAULT_CAROUSEL_GAP = 12;

/** One slide's width and the distance from one slide's start to the next's, for a carousel `width` wide. */
export function carouselSlideMetrics(
  width: number,
  peek: number,
  gap: number
): { readonly slideWidth: number; readonly interval: number } {
  if (peek <= NO_PEEK) {
    return { slideWidth: width, interval: width };
  }
  const slideWidth = Math.max(width - peek - gap, NO_PEEK);
  return { slideWidth, interval: slideWidth + gap };
}

/** The slide after `index`, back to the first after the last (auto-play's order). */
export function nextCarouselIndex(index: number, total: number): number {
  return index >= total - POSITION_OFFSET ? FIRST_INDEX : index + POSITION_OFFSET;
}

/** The default accessible names of the arrows (the web kit's `previousSlide` / `nextSlide`); generic and overridable. */
export const DEFAULT_CAROUSEL_PREVIOUS_LABEL = "Previous slide";
export const DEFAULT_CAROUSEL_NEXT_LABEL = "Next slide";

/** The slide `index` is clamped to: within the slides, and the first one when there are none. */
export function clampCarouselIndex(index: number, total: number): number {
  return Math.min(Math.max(index, FIRST_INDEX), Math.max(total - POSITION_OFFSET, FIRST_INDEX));
}

/** The default accessible name of a slide's dot; generic and overridable. */
export function defaultCarouselSlideLabel(position: number, total: number): string {
  return `Slide ${String(position)} of ${String(total)}`;
}

export interface CarouselProps {
  /** The slides, one per page. */
  readonly children: React.ReactNode;
  /** The slide that shows (zero-based). */
  readonly index: number;
  /** A swipe or a dot asked for another slide (zero-based). */
  readonly onChange: (index: number) => void;
  /** Names a slide for screen readers: `(2, 5)` → "Slide 2 of 5". */
  readonly slideLabel?: ((position: number, total: number) => string) | undefined;
  /** Hide the dots when the slides carry their own position (a counter in each slide). */
  readonly showIndicators?: boolean | undefined;
  /** Show previous / next buttons either side of the dots (each disabled at its end). */
  readonly showControls?: boolean | undefined;
  /** The arrows' accessible names. */
  readonly previousLabel?: string | undefined;
  readonly nextLabel?: string | undefined;
  /** Points of the next slide that show at the edge (0, the default: one full-width slide per page). */
  readonly peek?: number | undefined;
  /** Points between slides when they peek. */
  readonly gap?: number | undefined;
  /**
   * Move on to the next slide every this many milliseconds, wrapping to the first; `undefined` (the
   * default) never does. Stops for good once the person swipes or taps a dot or arrow; off with Reduce
   * Motion. Pass `undefined` while the screen is out of sight.
   */
  readonly autoPlayIntervalMs?: number | undefined;
  readonly variant?: CarouselVariant | undefined;
  readonly size?: CarouselSize | undefined;
  /** Extra classes for the container, merged last (layout: `mt-4`). */
  readonly className?: string | undefined;
  readonly testID?: string | undefined;
}

export const Carousel = React.memo(
  React.forwardRef<ViewInstance, CarouselProps>(function Carousel(
    {
      children,
      index,
      onChange,
      slideLabel = defaultCarouselSlideLabel,
      showIndicators = true,
      showControls = false,
      previousLabel = DEFAULT_CAROUSEL_PREVIOUS_LABEL,
      nextLabel = DEFAULT_CAROUSEL_NEXT_LABEL,
      peek = NO_PEEK,
      gap = DEFAULT_CAROUSEL_GAP,
      autoPlayIntervalMs,
      variant = "plain",
      size = "md",
      className,
      testID,
    },
    ref
  ): React.JSX.Element {
    const reduceMotion = useReduceMotion();
    const scrollRef = React.useRef<ScrollViewInstance>(null);
    // Display state only: the page width, measured once the carousel is laid out.
    const [pageWidth, setPageWidth] = React.useState(FIRST_INDEX);
    // The person swiped or tapped: auto-play stops for good (display state only).
    const [tookOver, setTookOver] = React.useState(false);
    const slides = React.Children.toArray(children);
    const total = slides.length;
    const peeks = peek > NO_PEEK;
    const { slideWidth, interval } = carouselSlideMetrics(pageWidth, peek, gap);
    const pageStyle = React.useMemo((): { readonly width: number } => ({ width: slideWidth }), [slideWidth]);
    const trackStyle = React.useMemo(
      (): { readonly gap: number } | undefined => (peeks ? { gap } : undefined),
      [gap, peeks]
    );

    const measure = React.useCallback((event: LayoutChangeEvent): void => {
      setPageWidth(event.nativeEvent.layout.width);
    }, []);

    // The caller moved `index` (a dot, or its own control): bring that page into view.
    React.useEffect((): void => {
      if (interval > FIRST_INDEX) {
        scrollRef.current?.scrollTo({ x: index * interval, animated: !reduceMotion });
      }
    }, [index, interval, reduceMotion]);

    // Auto-play: one timer per slide shown, so a slide always gets the full interval.
    const autoPlays = autoPlayIntervalMs !== undefined && !tookOver && !reduceMotion && total > POSITION_OFFSET;
    React.useEffect((): (() => void) | undefined => {
      if (!autoPlays) {
        return undefined;
      }
      const timer = setTimeout((): void => {
        onChange(nextCarouselIndex(index, total));
      }, autoPlayIntervalMs);
      return (): void => {
        clearTimeout(timer);
      };
    }, [autoPlayIntervalMs, autoPlays, index, onChange, total]);

    const takeOver = React.useCallback((): void => {
      setTookOver(true);
    }, []);

    const settle = React.useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
        if (interval <= FIRST_INDEX) {
          return;
        }
        const page = clampCarouselIndex(Math.round(event.nativeEvent.contentOffset.x / interval), total);
        if (page !== index) {
          onChange(page);
        }
      },
      [index, interval, onChange, total]
    );

    const select = React.useCallback(
      (slideIndex: number): void => {
        setTookOver(true);
        onChange(slideIndex);
      },
      [onChange]
    );
    const showPrevious = React.useCallback((): void => {
      select(clampCarouselIndex(index - POSITION_OFFSET, total));
    }, [index, select, total]);
    const showNext = React.useCallback((): void => {
      select(clampCarouselIndex(index + POSITION_OFFSET, total));
    }, [index, select, total]);

    return (
      <View ref={ref} testID={testID} onLayout={measure} className={cn(carouselVariants({ variant, size }), className)}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          // Full-width pages page; peeking slides snap to each slide's start instead.
          {...(peeks
            ? { snapToInterval: interval, decelerationRate: "fast", disableIntervalMomentum: true }
            : { pagingEnabled: true })}
          contentContainerStyle={trackStyle}
          onScrollBeginDrag={takeOver}
          onMomentumScrollEnd={settle}
          testID={testID === undefined ? undefined : `${testID}-pager`}>
          {slides.map((slide: React.ReactNode, slideIndex: number): React.JSX.Element => (
            <View
              // Children.toArray gives every slide a stable key; the position is its fallback.
              key={React.isValidElement(slide) && slide.key !== null ? slide.key : slideIndex}
              style={pageStyle}
              accessibilityElementsHidden={slideIndex !== index}
              importantForAccessibility={slideIndex === index ? "auto" : "no-hide-descendants"}>
              {slide}
            </View>
          ))}
        </ScrollView>
        {showIndicators || showControls ? (
          <View className="flex-row items-center justify-center gap-2">
            {showControls ? (
              <IconButton
                icon={ChevronLeftIcon}
                label={previousLabel}
                onPress={showPrevious}
                disabled={index <= FIRST_INDEX}
                variant="ghost"
                size="sm"
                {...(testID === undefined ? {} : { testID: `${testID}-previous` })}
              />
            ) : null}
            {showIndicators ? (
              <View className="flex-row items-center justify-center">
                {slides.map((slide: React.ReactNode, slideIndex: number): React.JSX.Element => (
                  <CarouselDot
                    key={React.isValidElement(slide) && slide.key !== null ? slide.key : slideIndex}
                    slideIndex={slideIndex}
                    selected={slideIndex === index}
                    label={slideLabel(slideIndex + POSITION_OFFSET, total)}
                    size={size}
                    onSelect={select}
                  />
                ))}
              </View>
            ) : null}
            {showControls ? (
              <IconButton
                icon={ChevronRightIcon}
                label={nextLabel}
                onPress={showNext}
                disabled={index >= total - POSITION_OFFSET}
                variant="ghost"
                size="sm"
                {...(testID === undefined ? {} : { testID: `${testID}-next` })}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    );
  })
);

interface CarouselDotProps {
  readonly slideIndex: number;
  readonly selected: boolean;
  readonly label: string;
  readonly size: CarouselSize;
  readonly onSelect: (index: number) => void;
}

/** One page dot: a 44 pt tall button around the visible dot (rules/04). */
const CarouselDot = React.memo(function CarouselDot({
  slideIndex,
  selected,
  label,
  size,
  onSelect,
}: CarouselDotProps): React.JSX.Element {
  const accessibilityState = React.useMemo(() => ({ selected }), [selected]);
  const select = React.useCallback((): void => {
    onSelect(slideIndex);
  }, [onSelect, slideIndex]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={accessibilityState}
      onPress={select}
      className="min-h-11 min-w-6 items-center justify-center px-1">
      <View className={carouselDotVariants({ size, selected })} />
    </Pressable>
  );
});
```

### `components/__tests__/carousel.test.tsx` (replace)

The previous suite plus: peek layout (slide width, `snapToInterval`, no `pagingEnabled`), settling on a snapped
slide, full-width paging unchanged, the metrics, the wrap-around order, and auto-play (moves and wraps, never without
an interval, stops after a swipe, stops after a dot, still with Reduce Motion — fake timers, a harness that owns the
index).

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as React from "react";
import { AccessibilityInfo, Text, type ViewInstance } from "react-native";

import {
  Carousel,
  carouselSlideMetrics,
  clampCarouselIndex,
  DEFAULT_CAROUSEL_GAP,
  defaultCarouselSlideLabel,
  nextCarouselIndex,
  type CarouselProps,
} from "../carousel";

const PAGE_WIDTH = 300;
const SECOND_SLIDE = 1;
const THIRD_SLIDE = 2;
/** The second slide's position as people count it. */
const SECOND_POSITION = 2;
const SLIDE_TITLES: readonly string[] = ["Welcome", "Rewards", "Security"];

function slides(): React.JSX.Element[] {
  return SLIDE_TITLES.map((title: string): React.JSX.Element => (
    <Text key={title} className="font-sans">
      {title}
    </Text>
  ));
}

function pageLabel(position: number, total: number): string {
  return `Page ${String(position)}/${String(total)}`;
}

/** Lays the carousel out at PAGE_WIDTH and swipes the pager to `page`. */
async function swipeTo(page: number): Promise<void> {
  await fireEvent(screen.getByTestId("carousel"), "layout", {
    nativeEvent: { layout: { width: PAGE_WIDTH, height: PAGE_WIDTH, x: 0, y: 0 } },
  });
  await fireEvent(screen.getByTestId("carousel-pager"), "momentumScrollEnd", {
    nativeEvent: { contentOffset: { x: page * PAGE_WIDTH, y: 0 } },
  });
}

describe("Carousel", () => {
  it("names each slide's dot 'Slide n of total' and marks the current one selected", async () => {
    await render(
      <Carousel index={SECOND_SLIDE} onChange={jest.fn()}>
        {slides()}
      </Carousel>
    );

    expect(screen.getByRole("button", { name: "Slide 1 of 3" })).not.toBeSelected();
    expect(screen.getByRole("button", { name: "Slide 2 of 3" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Slide 3 of 3" })).not.toBeSelected();
  });

  it("takes the caller's slide label", async () => {
    await render(
      <Carousel index={0} onChange={jest.fn()} slideLabel={pageLabel}>
        {slides()}
      </Carousel>
    );
    expect(screen.getByRole("button", { name: "Page 3/3" })).toBeOnTheScreen();
    expect(defaultCarouselSlideLabel(SECOND_POSITION, SLIDE_TITLES.length)).toBe("Slide 2 of 3");
  });

  it("reports the slide a dot asks for", async () => {
    const onChange = jest.fn();
    await render(
      <Carousel index={0} onChange={onChange}>
        {slides()}
      </Carousel>
    );
    await fireEvent.press(screen.getByRole("button", { name: "Slide 3 of 3" }));
    expect(onChange).toHaveBeenCalledWith(THIRD_SLIDE);
  });

  it("reports the page a swipe settles on, and only when it changed", async () => {
    const onChange = jest.fn();
    await render(
      <Carousel index={0} onChange={onChange} testID="carousel">
        {slides()}
      </Carousel>
    );

    await swipeTo(SECOND_SLIDE);
    expect(onChange).toHaveBeenCalledWith(SECOND_SLIDE);

    onChange.mockClear();
    await swipeTo(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("follows the controlled index: only the current slide is exposed to screen readers", async () => {
    const { rerender } = await render(
      <Carousel index={0} onChange={jest.fn()}>
        {slides()}
      </Carousel>
    );
    expect(screen.getByText("Welcome")).toBeOnTheScreen();
    expect(screen.queryByText("Rewards")).toBeNull();

    await rerender(
      <Carousel index={SECOND_SLIDE} onChange={jest.fn()}>
        {slides()}
      </Carousel>
    );
    expect(screen.getByText("Rewards")).toBeOnTheScreen();
    expect(screen.queryByText("Welcome")).toBeNull();
  });

  it("can hide its dots", async () => {
    await render(
      <Carousel index={0} onChange={jest.fn()} showIndicators={false}>
        {slides()}
      </Carousel>
    );
    expect(screen.queryByRole("button", { name: "Slide 1 of 3" })).toBeNull();
  });

  it("draws a card surface and smaller dots on request, merging the caller's className last", async () => {
    await render(
      <Carousel index={0} onChange={jest.fn()} variant="card" size="sm" className="mt-4 gap-4" testID="carousel">
        {slides()}
      </Carousel>
    );
    const className = String(screen.getByTestId("carousel").props.className);
    expect(className).toContain("bg-card");
    expect(className).toContain("mt-4");
    expect(className).toContain("gap-4");
    expect(className).not.toContain("gap-1");
  });

  it("adds previous / next arrows on request, each reporting its neighbour and disabled at its end", async () => {
    const onChange = jest.fn();
    const { rerender } = await render(
      <Carousel index={0} onChange={onChange} showControls>
        {slides()}
      </Carousel>
    );
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: "Next slide" }));
    expect(onChange).toHaveBeenLastCalledWith(SECOND_SLIDE);

    await rerender(
      <Carousel index={THIRD_SLIDE} onChange={onChange} showControls previousLabel="Back" nextLabel="Forward">
        {slides()}
      </Carousel>
    );
    expect(screen.getByRole("button", { name: "Forward" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(onChange).toHaveBeenLastCalledWith(SECOND_SLIDE);
  });

  it("keeps the arrows without the dots", async () => {
    await render(
      <Carousel index={0} onChange={jest.fn()} showControls showIndicators={false}>
        {slides()}
      </Carousel>
    );
    expect(screen.getByRole("button", { name: "Next slide" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Slide 1 of 3" })).toBeNull();
  });

  it("clamps an index to the slides", () => {
    expect(clampCarouselIndex(-1, SLIDE_TITLES.length)).toBe(0);
    expect(clampCarouselIndex(SECOND_SLIDE, SLIDE_TITLES.length)).toBe(SECOND_SLIDE);
    expect(clampCarouselIndex(SLIDE_TITLES.length, SLIDE_TITLES.length)).toBe(THIRD_SLIDE);
    expect(clampCarouselIndex(SECOND_SLIDE, 0)).toBe(0);
  });

  it("forwards its ref", async () => {
    const ref = React.createRef<ViewInstance>();
    await render(
      <Carousel ref={ref} index={0} onChange={jest.fn()}>
        {slides()}
      </Carousel>
    );
    expect(ref.current).not.toBeNull();
  });
});

const PEEK = 24;
const GAP = 12;
const AUTO_PLAY_MS = 4000;
/** Long enough for any pending timer to have fired. */
const LONG_WAIT_MS = AUTO_PLAY_MS * 3;

/** A screen that owns the carousel's slide, shows which one is current and lets the carousel change it. */
function OwnedCarousel(props: Partial<CarouselProps>): React.JSX.Element {
  const [index, setIndex] = React.useState(0);
  return (
    <>
      <Text>{`Showing ${String(index)}`}</Text>
      <Carousel index={index} onChange={setIndex} testID="carousel" {...props}>
        {slides()}
      </Carousel>
    </>
  );
}

async function wait(ms: number): Promise<void> {
  await act((): void => {
    jest.advanceTimersByTime(ms);
  });
}

describe("Carousel peek", () => {
  it("narrows each slide so the next one shows, and snaps slide by slide", async () => {
    await render(
      <Carousel index={0} onChange={jest.fn()} peek={PEEK} gap={GAP} testID="carousel">
        {slides()}
      </Carousel>
    );
    await fireEvent(screen.getByTestId("carousel"), "layout", {
      nativeEvent: { layout: { width: PAGE_WIDTH, height: PAGE_WIDTH, x: 0, y: 0 } },
    });

    const pager = screen.getByTestId("carousel-pager");
    expect(pager).toHaveProp("snapToInterval", PAGE_WIDTH - PEEK);
    expect(pager).not.toHaveProp("pagingEnabled");
  });

  it("settles on the slide a swipe snapped to", async () => {
    const onChange = jest.fn();
    await render(
      <Carousel index={0} onChange={onChange} peek={PEEK} gap={GAP} testID="carousel">
        {slides()}
      </Carousel>
    );
    await fireEvent(screen.getByTestId("carousel"), "layout", {
      nativeEvent: { layout: { width: PAGE_WIDTH, height: PAGE_WIDTH, x: 0, y: 0 } },
    });

    await fireEvent(screen.getByTestId("carousel-pager"), "momentumScrollEnd", {
      nativeEvent: { contentOffset: { x: THIRD_SLIDE * (PAGE_WIDTH - PEEK), y: 0 } },
    });

    expect(onChange).toHaveBeenCalledWith(THIRD_SLIDE);
  });

  it("pages full-width slides without a peek, as before", async () => {
    await render(
      <Carousel index={0} onChange={jest.fn()} testID="carousel">
        {slides()}
      </Carousel>
    );
    expect(screen.getByTestId("carousel-pager")).toHaveProp("pagingEnabled", true);
  });
});

describe("carouselSlideMetrics", () => {
  it("is the whole width per slide without a peek", () => {
    expect(carouselSlideMetrics(PAGE_WIDTH, 0, GAP)).toEqual({ slideWidth: PAGE_WIDTH, interval: PAGE_WIDTH });
  });

  it("leaves room for the peek and the gap, and steps a slide plus a gap", () => {
    expect(carouselSlideMetrics(PAGE_WIDTH, PEEK, DEFAULT_CAROUSEL_GAP)).toEqual({
      slideWidth: PAGE_WIDTH - PEEK - DEFAULT_CAROUSEL_GAP,
      interval: PAGE_WIDTH - PEEK,
    });
  });

  it("never goes below zero before the carousel is measured", () => {
    expect(carouselSlideMetrics(0, PEEK, GAP).slideWidth).toBe(0);
  });
});

describe("nextCarouselIndex", () => {
  it("moves on one slide, back to the first after the last", () => {
    expect(nextCarouselIndex(0, SLIDE_TITLES.length)).toBe(SECOND_SLIDE);
    expect(nextCarouselIndex(THIRD_SLIDE, SLIDE_TITLES.length)).toBe(0);
  });
});

describe("Carousel auto-play", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("moves on every interval and wraps to the first slide", async () => {
    await render(<OwnedCarousel autoPlayIntervalMs={AUTO_PLAY_MS} />);

    await wait(AUTO_PLAY_MS);
    expect(screen.getByText("Showing 1")).toBeOnTheScreen();
    await wait(AUTO_PLAY_MS);
    expect(screen.getByText("Showing 2")).toBeOnTheScreen();
    await wait(AUTO_PLAY_MS);
    expect(screen.getByText("Showing 0")).toBeOnTheScreen();
  });

  it("never moves on its own without an interval", async () => {
    await render(<OwnedCarousel />);

    await wait(LONG_WAIT_MS);

    expect(screen.getByText("Showing 0")).toBeOnTheScreen();
  });

  it("stops for good once the person swipes", async () => {
    await render(<OwnedCarousel autoPlayIntervalMs={AUTO_PLAY_MS} />);

    await fireEvent(screen.getByTestId("carousel-pager"), "scrollBeginDrag");
    await wait(LONG_WAIT_MS);

    expect(screen.getByText("Showing 0")).toBeOnTheScreen();
  });

  it("stops for good once the person picks a slide", async () => {
    await render(<OwnedCarousel autoPlayIntervalMs={AUTO_PLAY_MS} />);

    await fireEvent.press(screen.getByRole("button", { name: "Slide 3 of 3" }));
    await wait(LONG_WAIT_MS);

    expect(screen.getByText("Showing 2")).toBeOnTheScreen();
  });

  it("stays still with Reduce Motion on", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    await render(<OwnedCarousel autoPlayIntervalMs={AUTO_PLAY_MS} />);

    await wait(LONG_WAIT_MS);

    expect(screen.getByText("Showing 0")).toBeOnTheScreen();
  });
});
```

---

## B2. "Discover" on Home — `features/home-highlights/` (new)

A row of cards on Home, each pointing to a part of the app, on the carousel above: each card takes the full width of
the row (one card per page: `PEEK = 0` — raise it, e.g. to 32, to let the next card show at the edge), the row moves on every 6 s while Home is in front, and it stops for good once
the person swipes or picks a card. A card's button
opens its screen the way the drawer does: a tab is switched to (`router.navigate`), any other screen is pushed onto
its tab's stack with the tab's first screen underneath (`router.push(route, { withAnchor: true })`).

| File | What it is |
|---|---|
| `highlights.ts` | The cards: icon, tone, title, body, button label, route, whether it is a tab. Products replace these. |
| `labels.ts` | The section's copy and the dots' names ("Highlight 2 of 4"). |
| `home-highlights.tsx` | The section: heading + `Carousel` (`peek={PEEK}` with `PEEK = 0` — full-width cards; auto-play while focused) + the cards. |

### `features/home-highlights/highlights.ts`

```ts
// What the Home screen's "Discover" carousel points to: one card per part of the app worth a first
// look, in the order they are shown. Each card opens its screen the way the drawer does (a tab is
// switched to, any other screen is pushed onto its tab's stack). Products replace these with their own.

import ChartColumnIcon from "lucide-react-native/icons/chart-column";
import FileTextIcon from "lucide-react-native/icons/file-text";
import PaletteIcon from "lucide-react-native/icons/palette";
import ScanQrCodeIcon from "lucide-react-native/icons/scan-qr-code";

import type { LucideIcon } from "@workspace/ui-native/components/icon";
import type { IconTileTone } from "@workspace/ui-native/components/icon-tile";
import { ROUTES, type AppRoute } from "../../runtime/routes";

export interface HomeHighlight {
  /** Stable identity (the slide's key). */
  readonly key: string;
  readonly icon: LucideIcon;
  readonly tone: IconTileTone;
  readonly title: string;
  readonly body: string;
  /** The card's button. */
  readonly action: string;
  readonly route: AppRoute;
  /** A tab is switched to; any other screen is pushed onto its tab's stack. */
  readonly isTab: boolean;
}

export const HOME_HIGHLIGHTS: readonly HomeHighlight[] = [
  {
    key: "analytics",
    icon: ChartColumnIcon,
    tone: "blue",
    title: "See your activity",
    body: "Spending, visits and rewards over the last week, month or quarter.",
    action: "Open analytics",
    route: ROUTES.analytics,
    isTab: true,
  },
  {
    key: "qr-scanner",
    icon: ScanQrCodeIcon,
    tone: "green",
    title: "Scan a QR code",
    body: "Point your camera at a code to read a link, a Wi-Fi network or a contact.",
    action: "Scan a code",
    route: ROUTES.qrScanner,
    isTab: false,
  },
  {
    key: "pdf-viewer",
    icon: FileTextIcon,
    tone: "orange",
    title: "Read a PDF",
    body: "Open a document from your phone and read it page by page, right here.",
    action: "Open a PDF",
    route: ROUTES.pdfViewer,
    isTab: false,
  },
  {
    key: "appearance",
    icon: PaletteIcon,
    tone: "teal",
    title: "Make it yours",
    body: "Light, dark or Nord: pick the look that suits you, or follow your phone.",
    action: "Choose a theme",
    route: ROUTES.appearance,
    isTab: false,
  },
];
```

### `features/home-highlights/labels.ts`

```ts
// Copy of the Home screen's "Discover" carousel (features/home-highlights).

export const HOME_HIGHLIGHTS_COPY = {
  title: "Discover",
  description: "A few things to try first.",
} satisfies Record<string, string>;

/** Names a card's dot for screen readers: "Highlight 2 of 4". */
export function homeHighlightSlideLabel(position: number, total: number): string {
  return `Highlight ${String(position)} of ${String(total)}`;
}
```

### `features/home-highlights/home-highlights.tsx`

```tsx
// The Home screen's "Discover" carousel: a row of cards, each pointing to a part of the app
// (highlights.ts), built on the kit's generic `Carousel` (@/ui/components/carousel). Each card takes
// the full width of the row, one per page; the row moves on by itself every few seconds while Home is
// the screen in front, and stops for good once the person swipes or picks a card (the carousel's own
// rule). A card's button opens its screen the way the drawer does.

import { useIsFocused, useRouter } from "expo-router";
import * as React from "react";
import { View } from "react-native";

import { Button } from "@workspace/ui-native/components/button";
import { Carousel } from "@workspace/ui-native/components/carousel";
import { IconTile } from "@workspace/ui-native/components/icon-tile";
import { MutedText, Subheading } from "@workspace/ui-native/components/text";

import { HOME_HIGHLIGHTS, type HomeHighlight } from "./highlights";
import { HOME_HIGHLIGHTS_COPY, homeHighlightSlideLabel } from "./labels";

/** How long each card stays before the row moves on. */
export const HOME_HIGHLIGHTS_AUTO_PLAY_MS = 6000;
/**
 * How much of the next card shows at the edge, in points. 0: each card takes the full width of the row;
 * raise it (32 shows a card's edge) to hint that there is more to swipe.
 */
const PEEK = 0;
const FIRST_SLIDE = 0;

export function HomeHighlights(): React.JSX.Element {
  const router = useRouter();
  // Home stays mounted under its stack and behind other tabs: the row only moves while it is seen.
  const focused = useIsFocused();
  const [index, setIndex] = React.useState(FIRST_SLIDE);
  const open = React.useCallback(
    (highlight: HomeHighlight): void => {
      if (highlight.isTab) {
        router.navigate(highlight.route);
      } else {
        // `withAnchor`: the tab's first screen (Settings) goes underneath, so "back" lands on it.
        router.push(highlight.route, { withAnchor: true });
      }
    },
    [router]
  );

  return (
    <View className="gap-3" testID="home-highlights">
      <View className="gap-0.5">
        <Subheading>{HOME_HIGHLIGHTS_COPY.title}</Subheading>
        <MutedText>{HOME_HIGHLIGHTS_COPY.description}</MutedText>
      </View>
      <Carousel
        index={index}
        onChange={setIndex}
        peek={PEEK}
        autoPlayIntervalMs={focused ? HOME_HIGHLIGHTS_AUTO_PLAY_MS : undefined}
        slideLabel={homeHighlightSlideLabel}
        size="sm"
        testID="home-highlights-carousel">
        {HOME_HIGHLIGHTS.map((highlight: HomeHighlight): React.JSX.Element => (
          <HighlightCard key={highlight.key} highlight={highlight} onOpen={open} />
        ))}
      </Carousel>
    </View>
  );
}

interface HighlightCardProps {
  readonly highlight: HomeHighlight;
  readonly onOpen: (highlight: HomeHighlight) => void;
}

function HighlightCard({ highlight, onOpen }: HighlightCardProps): React.JSX.Element {
  const openThis = React.useCallback((): void => {
    onOpen(highlight);
  }, [highlight, onOpen]);
  return (
    <View
      className="flex-1 gap-3 rounded-xl border border-border bg-card p-4"
      testID={`home-highlight-${highlight.key}`}>
      <IconTile icon={highlight.icon} tone={highlight.tone} />
      <View className="flex-1 gap-1">
        <Subheading numberOfLines={1}>{highlight.title}</Subheading>
        <MutedText numberOfLines={3}>{highlight.body}</MutedText>
      </View>
      <View className="flex-row">
        <Button
          label={highlight.action}
          accessibilityLabel={`${highlight.action}: ${highlight.title}`}
          onPress={openThis}
          variant="secondary"
          size="sm"
        />
      </View>
    </View>
  );
}
```

### Home screen (edit)

In this repo Home is `app/(app)/(home)/index.tsx` (Home as a stack — porting guide section 10); in the starter kit it
is still `app/(app)/index.tsx`. Either way, render the section under the account card:

```diff
+import { HomeHighlights } from "../../../features/home-highlights/home-highlights";
 …
         </Card>
       )}
+      <HomeHighlights />
       <Card title="This is the starter shell">
```

(Adjust the relative path to where Home lives: `../../features/…` from `app/(app)/index.tsx`.)

### `features/home-highlights/__tests__/home-highlights.test.tsx` (new)

Inside Expo Router's real in-memory router (`renderRouter` from `expo-router/testing-library`), so a card's button is
checked by where the router ends up: a card per highlight with named dots, full-width cards (one per page, no
snapping interval), a tab switched to, a Settings screen opened; every card points at a real route; `isTab` matches the app's tabs.

```tsx
// The Discover carousel inside a real (in-memory) Expo Router, so a card's button is checked by where
// the router actually ends up.

import { fireEvent, renderRouter, screen } from "expo-router/testing-library";
import * as React from "react";
import { Text } from "react-native";

import { ROUTES } from "../../../runtime/routes";
import { APP_TABS } from "../../navigation/app-tabs";
import { HOME_HIGHLIGHTS } from "../highlights";
import { HomeHighlights } from "../home-highlights";
import { HOME_HIGHLIGHTS_COPY, homeHighlightSlideLabel } from "../labels";

const SECOND_POSITION = 2;

function Destination({ name }: { readonly name: string }): React.JSX.Element {
  return <Text>{`At ${name}`}</Text>;
}

async function renderHome(): Promise<void> {
  await renderRouter(
    {
      index: HomeHighlights,
      analytics: (): React.JSX.Element => <Destination name="analytics" />,
      "settings/index": (): React.JSX.Element => <Destination name="settings" />,
      "settings/qr-scanner": (): React.JSX.Element => <Destination name="qr scanner" />,
      "settings/pdf-viewer": (): React.JSX.Element => <Destination name="pdf viewer" />,
      "settings/appearance": (): React.JSX.Element => <Destination name="appearance" />,
    },
    { initialUrl: ROUTES.home }
  );
}

describe("HomeHighlights", () => {
  it("shows a card per highlight, the first one in view, each with a named dot", async () => {
    await renderHome();

    expect(screen.getByText(HOME_HIGHLIGHTS_COPY.title)).toBeOnTheScreen();
    expect(screen.getByText("See your activity")).toBeOnTheScreen();
    for (const [position] of HOME_HIGHLIGHTS.entries()) {
      expect(
        screen.getByRole("button", { name: homeHighlightSlideLabel(position + 1, HOME_HIGHLIGHTS.length) })
      ).toBeOnTheScreen();
    }
  });

  it("gives each card the full width of the row, one card per page", async () => {
    await renderHome();

    const pager = screen.getByTestId("home-highlights-carousel-pager");
    expect(pager).toHaveProp("pagingEnabled", true);
    expect(pager).not.toHaveProp("snapToInterval");
  });

  it("switches to a tab from its card", async () => {
    await renderHome();

    await fireEvent.press(screen.getByRole("button", { name: "Open analytics: See your activity" }));

    expect(screen).toHavePathname(ROUTES.analytics);
  });

  it("opens a screen under Settings from its card", async () => {
    await renderHome();
    await fireEvent.press(
      screen.getByRole("button", { name: homeHighlightSlideLabel(SECOND_POSITION, HOME_HIGHLIGHTS.length) })
    );

    await fireEvent.press(screen.getByRole("button", { name: "Scan a code: Scan a QR code" }));

    expect(screen).toHavePathname(ROUTES.qrScanner);
  });
});

describe("HOME_HIGHLIGHTS", () => {
  it("points every card at one of the app's screens, each card once", () => {
    const routes: ReadonlySet<string> = new Set(Object.values(ROUTES));
    for (const highlight of HOME_HIGHLIGHTS) {
      expect(routes.has(highlight.route)).toBe(true);
    }
    expect(new Set(HOME_HIGHLIGHTS.map((highlight) => highlight.key)).size).toBe(HOME_HIGHLIGHTS.length);
  });

  it("marks a card as a tab exactly when its screen is one of the tabs", () => {
    const tabRoutes: ReadonlySet<string> = new Set(APP_TABS.map((tab) => tab.route));
    for (const highlight of HOME_HIGHLIGHTS) {
      expect(highlight.isTab).toBe(tabRoutes.has(highlight.route));
    }
  });
});
```

---

## Porting steps (starter kit)

1. **Header (A):** replace `apps/mobile/src/components/page-header.tsx` and its test with the files above (if the
   starter kit's header is still the older "slide with the content" version, also apply the porting guide's
   sections 1–3 — the scroll link, `app-shell.tsx`, `app-header.tsx`).
2. **Carousel (B1):** replace `packages/ui-native/src/components/carousel.tsx` and
   `packages/ui-native/src/components/__tests__/carousel.test.tsx`. The starter kit's current carousel is this repo's
   previous one (identical apart from formatting), so nothing else depends on the change; `ImageCarousel` keeps
   working as it is.
3. **Discover (B2):** add `apps/mobile/src/features/home-highlights/` (three files + the test) and render
   `<HomeHighlights />` on Home. The routes it uses (`ROUTES.analytics`, `qrScanner`, `pdfViewer`, `appearance`)
   exist in the starter kit's `runtime/routes.ts`.
4. Format, then the gate: `pnpm --filter @workspace/ui-native run lint typecheck test` and
   `pnpm --filter @workspace/mobile run lint typecheck test`.

## Pitfalls

- **Don't interpolate the header's colour.** Reanimated's `interpolateColor` can't parse `oklch()` and the tokens are
  CSS variables, not numbers in JS; cross-fade a token-coloured layer's opacity instead.
- **Keep the surface and hairline inside the moving background layer** — outside it they would stay at the expanded
  height while the bar's edge rises.
- **Peek needs `snapToInterval`, not `pagingEnabled`.** Paging snaps to the ScrollView's width, which is no longer one
  slide; snap to `slideWidth + gap` and turn off interval momentum so a fling moves one card.
- **Auto-play must stop.** A timer that keeps going after the person swipes fights their finger; one that runs with
  Reduce Motion on, or on a screen out of sight, is an accessibility and battery bug. The kit stops on takeover and
  with Reduce Motion; the caller passes `undefined` while unfocused.
- **Test auto-play with a harness that owns `index`** (the carousel is controlled — an `onChange` spy alone never moves
  it) and fake timers advanced inside `act`.
- **Test navigation from a component with `renderRouter`** and assert `toHavePathname` — a mocked router only proves a
  function was called.

## Test checklist (on a device)

1. **Dark theme, any long page (Analytics, Settings):** scroll down — the bar turns into the content's surface, a fine
   hairline appears at its bottom edge as the header finishes collapsing; no dark band over a lighter page. Scroll
   back up — the bar returns to the page colour, the curved sheet reappears under it.
2. **Nord:** the same, with Nord's `#3b4252` bar over `#3b4252` content.
3. **Light:** the bar turns near-white; the hairline separates it from the content.
4. **Home → Discover:** the first card fills the row's full width (no next card peeking in); after ~6 s it moves on by
   itself, then again, wrapping to the first after the last.
5. **Swipe the carousel** (or tap a dot): it goes where you say and never moves on its own again on that visit.
6. **A card's button:** "Open analytics" switches to the Analytics tab; "Scan a code" / "Open a PDF" / "Choose a
   theme" open the screen with Settings underneath (Back lands on Settings).
7. **Leave Home** (another tab, or a team member): when you come back the carousel is where you left it — it didn't
   move while you were away.
8. **Reduce Motion on:** the carousel never moves on its own.

## Gate results (this repo, after the last edit)

| Command | Result |
|---|---|
| `pnpm run format` | ✅ |
| `pnpm run lint` | ✅ 0 errors, 0 warnings |
| `pnpm run typecheck` | ✅ |
| `pnpm run test` | ✅ 150 suites, 1,198 tests |
| `pnpm exec expo install --check` | ✅ up to date |
| `test:e2e` | — this repo has no end-to-end suite |

---

## Updated 1

What changed after the first version above (everything above is left as it was first written; where it differs,
this section wins).

| # | Change | Why | Files |
|---|---|---|---|
| 1 | Home's carousel keeps the peek setting, at `PEEK = 0` | Full-width cards on Home, with the option kept: raise `PEEK` (e.g. to 32) to show the next card's edge again | `features/home-highlights/home-highlights.tsx` |
| 2 | `gap` now works **without** a peek: full-width slides kept apart while swiped | With `PEEK = 0` the cards sat flush, so their borders touched mid-swipe ("sticking together") | `components/carousel.tsx` (kit) |
| 3 | Home's carousel passes `gap={HOME_HIGHLIGHTS_GAP}` (16 pt) | Space between the full-width cards while the row is swiped | `features/home-highlights/home-highlights.tsx` |
| 4 | Tests for both | — | `components/__tests__/carousel.test.tsx`, `features/home-highlights/__tests__/home-highlights.test.tsx` |

Part A (the header surface) is unchanged.

### 1. `PEEK = 0` on Home

```tsx
/**
 * How much of the next card shows at the edge, in points. 0: each card takes the full width of the row;
 * raise it (32 shows a card's edge) to hint that there is more to swipe.
 */
const PEEK = 0;
/** Space between cards, so their borders never touch while the row is swiped. */
export const HOME_HIGHLIGHTS_GAP = 16;
// …
<Carousel index={index} onChange={setIndex} peek={PEEK} gap={HOME_HIGHLIGHTS_GAP} /* … */>
```

### 2. `gap` without a peek — the kit `Carousel`

Before, the gap only existed when slides peeked: with `peek` 0 the carousel used `pagingEnabled` and slides touched.
Now:

| `peek` | `gap` | Slide width | Snap | Notes |
|---|---|---|---|---|
| 0 | not set (default) | full width | `pagingEnabled` | **unchanged** — touching pages, as a picture gallery's (`ImageCarousel`) |
| 0 | > 0 | full width | `snapToInterval = width + gap` | **new** — full-width slides, `gap` apart while swiped |
| > 0 | not set → `DEFAULT_CAROUSEL_GAP` (12) | `width − peek − gap` | `snapToInterval = slideWidth + gap` | unchanged |
| > 0 | > 0 | `width − peek − gap` | `snapToInterval = slideWidth + gap` | unchanged |

The default gap therefore now depends on the peek (`carouselGapOf`): the caller's gap if given, else 12 with a peek,
else 0 — so every existing use renders exactly as before.

```ts
/** The gap a carousel uses: the caller's, else the default when slides peek and none when they don't. */
export function carouselGapOf(peek: number, gap: number | undefined): number {
  return gap ?? (peek > NO_PEEK ? DEFAULT_CAROUSEL_GAP : NO_GAP);
}

/** The whole width without a peek, less the peek and the gap with one; the gap is added between slides either way. */
export function carouselSlideMetrics(width: number, peek: number, gap: number) {
  const slideWidth = peek > NO_PEEK ? Math.max(width - peek - gap, NO_PEEK) : width;
  return { slideWidth, interval: slideWidth + gap };
}

// In the component:
const gap = carouselGapOf(peek, gapProp);
// Slides that peek or keep a gap snap slide by slide; touching full-width pages simply page.
const snaps = peek > NO_PEEK || gap > NO_GAP;
```

`carouselSlideMetrics(width, 0, gap)` used to return `{ slideWidth: width, interval: width }` whatever the gap; it now
adds the gap to the interval. The `gap` prop's doc comment and the file's header comment describe the new case.

### Updated files (replace)

`packages/ui-native/src/components/carousel.tsx` (kit — relative imports, drops in as it is):

```tsx
// Slides side by side, one per page (the web kit's `Carousel`): a horizontal
// paging ScrollView with a row of page dots under it — and, with
// `showControls`, previous / next buttons either side of the dots (the web
// kit's arrows). Controlled: the caller owns which slide shows (`index`) and
// hears every change (`onChange`), from a swipe, a dot or an arrow. Each dot is
// a button named by `slideLabel` ("Slide 2 of 5"), and the current one is
// announced as selected.
//
//   ┌──────────────────────────┐
//   │          slide           │   swipe left / right
//   └──────────────────────────┘
//          ‹  ━━ • • •  ›            dots: the current one a pill; arrows on request
//
// Two options for content carousels (a row of cards on a dashboard):
//   - `peek`: each slide is narrower than the carousel, so the start of the next one shows at the edge
//     (a cue that there is more to swipe); slides sit `gap` apart and snap into place.
//
//       ┌────────────────────┐ ┌───
//       │       slide        │ │ ne…      ← `peek` points of the next slide
//       └────────────────────┘ └───
//
//   - `gap`: space between slides, with or without a peek. Full-width slides with a gap keep apart while
//     they are swiped (cards with borders would otherwise touch) and still snap one slide per page.
//
//   - `autoPlayIntervalMs`: moves on to the next slide on its own, back to the first after the last. It
//     stops for good the moment the person takes over (a swipe, a dot or an arrow), and never runs with
//     the OS "Reduce Motion" setting on — moving content must be stoppable (WCAG 2.2.2). The caller turns
//     it off while the screen is out of sight (pass `undefined`).

import { cva, type VariantProps } from "class-variance-authority";
import ChevronLeftIcon from "lucide-react-native/icons/chevron-left";
import ChevronRightIcon from "lucide-react-native/icons/chevron-right";
import * as React from "react";
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  View,
  type ViewInstance,
} from "react-native";

import { cn } from "../lib/cn";
import { useReduceMotion } from "../lib/use-reduce-motion";
import { IconButton } from "./icon-button";

export const carouselVariants = cva("w-full", {
  variants: {
    /** `plain`: slides straight on the page. `card`: slides inside a bordered card surface. */
    variant: {
      plain: "",
      card: "overflow-hidden rounded-xl border border-border bg-card pb-1",
    },
    /** The page dots' size, and the space above them. */
    size: {
      sm: "gap-1",
      md: "gap-2",
    },
  },
  defaultVariants: { variant: "plain", size: "md" },
});

export const carouselDotVariants = cva("rounded-full", {
  variants: {
    size: {
      sm: "h-1.5",
      md: "h-2",
    },
    selected: {
      true: "bg-primary",
      false: "bg-border",
    },
  },
  compoundVariants: [
    { size: "sm", selected: false, className: "w-1.5" },
    { size: "sm", selected: true, className: "w-4" },
    { size: "md", selected: false, className: "w-2" },
    { size: "md", selected: true, className: "w-6" },
  ],
  defaultVariants: { size: "md", selected: false },
});

type CarouselVariantProps = VariantProps<typeof carouselVariants>;
export type CarouselVariant = NonNullable<CarouselVariantProps["variant"]>;
export type CarouselSize = NonNullable<CarouselVariantProps["size"]>;

/** A slide's position counts from one for people ("Slide 1 of 5"); indexes count from zero. */
const POSITION_OFFSET = 1;
const FIRST_INDEX = 0;
/** No peek: one full-width slide per page. */
const NO_PEEK = 0;
/** No space between slides: full-width pages that touch, as a picture gallery's do. */
const NO_GAP = 0;
/** Points between slides when they peek, unless the caller says otherwise. */
export const DEFAULT_CAROUSEL_GAP = 12;

/** The gap a carousel uses: the caller's, else the default when slides peek and none when they don't. */
export function carouselGapOf(peek: number, gap: number | undefined): number {
  return gap ?? (peek > NO_PEEK ? DEFAULT_CAROUSEL_GAP : NO_GAP);
}

/**
 * One slide's width and the distance from one slide's start to the next's, for a carousel `width` wide:
 * the whole width without a peek, less the peek and the gap with one; the gap is added between slides either way.
 */
export function carouselSlideMetrics(
  width: number,
  peek: number,
  gap: number
): { readonly slideWidth: number; readonly interval: number } {
  const slideWidth = peek > NO_PEEK ? Math.max(width - peek - gap, NO_PEEK) : width;
  return { slideWidth, interval: slideWidth + gap };
}

/** The slide after `index`, back to the first after the last (auto-play's order). */
export function nextCarouselIndex(index: number, total: number): number {
  return index >= total - POSITION_OFFSET ? FIRST_INDEX : index + POSITION_OFFSET;
}

/** The default accessible names of the arrows (the web kit's `previousSlide` / `nextSlide`); generic and overridable. */
export const DEFAULT_CAROUSEL_PREVIOUS_LABEL = "Previous slide";
export const DEFAULT_CAROUSEL_NEXT_LABEL = "Next slide";

/** The slide `index` is clamped to: within the slides, and the first one when there are none. */
export function clampCarouselIndex(index: number, total: number): number {
  return Math.min(Math.max(index, FIRST_INDEX), Math.max(total - POSITION_OFFSET, FIRST_INDEX));
}

/** The default accessible name of a slide's dot; generic and overridable. */
export function defaultCarouselSlideLabel(position: number, total: number): string {
  return `Slide ${String(position)} of ${String(total)}`;
}

export interface CarouselProps {
  /** The slides, one per page. */
  readonly children: React.ReactNode;
  /** The slide that shows (zero-based). */
  readonly index: number;
  /** A swipe or a dot asked for another slide (zero-based). */
  readonly onChange: (index: number) => void;
  /** Names a slide for screen readers: `(2, 5)` → "Slide 2 of 5". */
  readonly slideLabel?: ((position: number, total: number) => string) | undefined;
  /** Hide the dots when the slides carry their own position (a counter in each slide). */
  readonly showIndicators?: boolean | undefined;
  /** Show previous / next buttons either side of the dots (each disabled at its end). */
  readonly showControls?: boolean | undefined;
  /** The arrows' accessible names. */
  readonly previousLabel?: string | undefined;
  readonly nextLabel?: string | undefined;
  /** Points of the next slide that show at the edge (0, the default: one full-width slide per page). */
  readonly peek?: number | undefined;
  /**
   * Points between slides — with a peek, or full-width slides kept apart while swiped. Defaults to
   * `DEFAULT_CAROUSEL_GAP` with a peek, and none without one (pages that touch, as before).
   */
  readonly gap?: number | undefined;
  /**
   * Move on to the next slide every this many milliseconds, wrapping to the first; `undefined` (the
   * default) never does. Stops for good once the person swipes or taps a dot or arrow; off with Reduce
   * Motion. Pass `undefined` while the screen is out of sight.
   */
  readonly autoPlayIntervalMs?: number | undefined;
  readonly variant?: CarouselVariant | undefined;
  readonly size?: CarouselSize | undefined;
  /** Extra classes for the container, merged last (layout: `mt-4`). */
  readonly className?: string | undefined;
  readonly testID?: string | undefined;
}

export const Carousel = React.memo(
  React.forwardRef<ViewInstance, CarouselProps>(function Carousel(
    {
      children,
      index,
      onChange,
      slideLabel = defaultCarouselSlideLabel,
      showIndicators = true,
      showControls = false,
      previousLabel = DEFAULT_CAROUSEL_PREVIOUS_LABEL,
      nextLabel = DEFAULT_CAROUSEL_NEXT_LABEL,
      peek = NO_PEEK,
      gap: gapProp,
      autoPlayIntervalMs,
      variant = "plain",
      size = "md",
      className,
      testID,
    },
    ref
  ): React.JSX.Element {
    const reduceMotion = useReduceMotion();
    const scrollRef = React.useRef<ScrollViewInstance>(null);
    // Display state only: the page width, measured once the carousel is laid out.
    const [pageWidth, setPageWidth] = React.useState(FIRST_INDEX);
    // The person swiped or tapped: auto-play stops for good (display state only).
    const [tookOver, setTookOver] = React.useState(false);
    const slides = React.Children.toArray(children);
    const total = slides.length;
    const gap = carouselGapOf(peek, gapProp);
    // Slides that peek or keep a gap snap slide by slide; touching full-width pages simply page.
    const snaps = peek > NO_PEEK || gap > NO_GAP;
    const { slideWidth, interval } = carouselSlideMetrics(pageWidth, peek, gap);
    const pageStyle = React.useMemo((): { readonly width: number } => ({ width: slideWidth }), [slideWidth]);
    const trackStyle = React.useMemo(
      (): { readonly gap: number } | undefined => (snaps ? { gap } : undefined),
      [gap, snaps]
    );

    const measure = React.useCallback((event: LayoutChangeEvent): void => {
      setPageWidth(event.nativeEvent.layout.width);
    }, []);

    // The caller moved `index` (a dot, or its own control): bring that page into view.
    React.useEffect((): void => {
      if (interval > FIRST_INDEX) {
        scrollRef.current?.scrollTo({ x: index * interval, animated: !reduceMotion });
      }
    }, [index, interval, reduceMotion]);

    // Auto-play: one timer per slide shown, so a slide always gets the full interval.
    const autoPlays = autoPlayIntervalMs !== undefined && !tookOver && !reduceMotion && total > POSITION_OFFSET;
    React.useEffect((): (() => void) | undefined => {
      if (!autoPlays) {
        return undefined;
      }
      const timer = setTimeout((): void => {
        onChange(nextCarouselIndex(index, total));
      }, autoPlayIntervalMs);
      return (): void => {
        clearTimeout(timer);
      };
    }, [autoPlayIntervalMs, autoPlays, index, onChange, total]);

    const takeOver = React.useCallback((): void => {
      setTookOver(true);
    }, []);

    const settle = React.useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
        if (interval <= FIRST_INDEX) {
          return;
        }
        const page = clampCarouselIndex(Math.round(event.nativeEvent.contentOffset.x / interval), total);
        if (page !== index) {
          onChange(page);
        }
      },
      [index, interval, onChange, total]
    );

    const select = React.useCallback(
      (slideIndex: number): void => {
        setTookOver(true);
        onChange(slideIndex);
      },
      [onChange]
    );
    const showPrevious = React.useCallback((): void => {
      select(clampCarouselIndex(index - POSITION_OFFSET, total));
    }, [index, select, total]);
    const showNext = React.useCallback((): void => {
      select(clampCarouselIndex(index + POSITION_OFFSET, total));
    }, [index, select, total]);

    return (
      <View ref={ref} testID={testID} onLayout={measure} className={cn(carouselVariants({ variant, size }), className)}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          // Touching full-width pages page; slides that peek or keep a gap snap to each slide's start instead.
          {...(snaps
            ? { snapToInterval: interval, decelerationRate: "fast", disableIntervalMomentum: true }
            : { pagingEnabled: true })}
          contentContainerStyle={trackStyle}
          onScrollBeginDrag={takeOver}
          onMomentumScrollEnd={settle}
          testID={testID === undefined ? undefined : `${testID}-pager`}>
          {slides.map((slide: React.ReactNode, slideIndex: number): React.JSX.Element => (
            <View
              // Children.toArray gives every slide a stable key; the position is its fallback.
              key={React.isValidElement(slide) && slide.key !== null ? slide.key : slideIndex}
              style={pageStyle}
              accessibilityElementsHidden={slideIndex !== index}
              importantForAccessibility={slideIndex === index ? "auto" : "no-hide-descendants"}>
              {slide}
            </View>
          ))}
        </ScrollView>
        {showIndicators || showControls ? (
          <View className="flex-row items-center justify-center gap-2">
            {showControls ? (
              <IconButton
                icon={ChevronLeftIcon}
                label={previousLabel}
                onPress={showPrevious}
                disabled={index <= FIRST_INDEX}
                variant="ghost"
                size="sm"
                {...(testID === undefined ? {} : { testID: `${testID}-previous` })}
              />
            ) : null}
            {showIndicators ? (
              <View className="flex-row items-center justify-center">
                {slides.map((slide: React.ReactNode, slideIndex: number): React.JSX.Element => (
                  <CarouselDot
                    key={React.isValidElement(slide) && slide.key !== null ? slide.key : slideIndex}
                    slideIndex={slideIndex}
                    selected={slideIndex === index}
                    label={slideLabel(slideIndex + POSITION_OFFSET, total)}
                    size={size}
                    onSelect={select}
                  />
                ))}
              </View>
            ) : null}
            {showControls ? (
              <IconButton
                icon={ChevronRightIcon}
                label={nextLabel}
                onPress={showNext}
                disabled={index >= total - POSITION_OFFSET}
                variant="ghost"
                size="sm"
                {...(testID === undefined ? {} : { testID: `${testID}-next` })}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    );
  })
);

interface CarouselDotProps {
  readonly slideIndex: number;
  readonly selected: boolean;
  readonly label: string;
  readonly size: CarouselSize;
  readonly onSelect: (index: number) => void;
}

/** One page dot: a 44 pt tall button around the visible dot (rules/04). */
const CarouselDot = React.memo(function CarouselDot({
  slideIndex,
  selected,
  label,
  size,
  onSelect,
}: CarouselDotProps): React.JSX.Element {
  const accessibilityState = React.useMemo(() => ({ selected }), [selected]);
  const select = React.useCallback((): void => {
    onSelect(slideIndex);
  }, [onSelect, slideIndex]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={accessibilityState}
      onPress={select}
      className="min-h-11 min-w-6 items-center justify-center px-1">
      <View className={carouselDotVariants({ size, selected })} />
    </Pressable>
  );
});
```

`packages/ui-native/src/components/__tests__/carousel.test.tsx` — adds: full-width slides with a gap snap
`width + gap` and set the track's `gap`; touching pages without peek or gap still page; `carouselGapOf`; the metrics
with a gap and no peek:

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as React from "react";
import { AccessibilityInfo, Text, type ViewInstance } from "react-native";

import {
  Carousel,
  carouselGapOf,
  carouselSlideMetrics,
  clampCarouselIndex,
  DEFAULT_CAROUSEL_GAP,
  defaultCarouselSlideLabel,
  nextCarouselIndex,
  type CarouselProps,
} from "../carousel";

const PAGE_WIDTH = 300;
const SECOND_SLIDE = 1;
const THIRD_SLIDE = 2;
/** The second slide's position as people count it. */
const SECOND_POSITION = 2;
const SLIDE_TITLES: readonly string[] = ["Welcome", "Rewards", "Security"];

function slides(): React.JSX.Element[] {
  return SLIDE_TITLES.map((title: string): React.JSX.Element => (
    <Text key={title} className="font-sans">
      {title}
    </Text>
  ));
}

function pageLabel(position: number, total: number): string {
  return `Page ${String(position)}/${String(total)}`;
}

/** Lays the carousel out at PAGE_WIDTH and swipes the pager to `page`. */
async function swipeTo(page: number): Promise<void> {
  await fireEvent(screen.getByTestId("carousel"), "layout", {
    nativeEvent: { layout: { width: PAGE_WIDTH, height: PAGE_WIDTH, x: 0, y: 0 } },
  });
  await fireEvent(screen.getByTestId("carousel-pager"), "momentumScrollEnd", {
    nativeEvent: { contentOffset: { x: page * PAGE_WIDTH, y: 0 } },
  });
}

describe("Carousel", () => {
  it("names each slide's dot 'Slide n of total' and marks the current one selected", async () => {
    await render(
      <Carousel index={SECOND_SLIDE} onChange={jest.fn()}>
        {slides()}
      </Carousel>
    );

    expect(screen.getByRole("button", { name: "Slide 1 of 3" })).not.toBeSelected();
    expect(screen.getByRole("button", { name: "Slide 2 of 3" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Slide 3 of 3" })).not.toBeSelected();
  });

  it("takes the caller's slide label", async () => {
    await render(
      <Carousel index={0} onChange={jest.fn()} slideLabel={pageLabel}>
        {slides()}
      </Carousel>
    );
    expect(screen.getByRole("button", { name: "Page 3/3" })).toBeOnTheScreen();
    expect(defaultCarouselSlideLabel(SECOND_POSITION, SLIDE_TITLES.length)).toBe("Slide 2 of 3");
  });

  it("reports the slide a dot asks for", async () => {
    const onChange = jest.fn();
    await render(
      <Carousel index={0} onChange={onChange}>
        {slides()}
      </Carousel>
    );
    await fireEvent.press(screen.getByRole("button", { name: "Slide 3 of 3" }));
    expect(onChange).toHaveBeenCalledWith(THIRD_SLIDE);
  });

  it("reports the page a swipe settles on, and only when it changed", async () => {
    const onChange = jest.fn();
    await render(
      <Carousel index={0} onChange={onChange} testID="carousel">
        {slides()}
      </Carousel>
    );

    await swipeTo(SECOND_SLIDE);
    expect(onChange).toHaveBeenCalledWith(SECOND_SLIDE);

    onChange.mockClear();
    await swipeTo(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("follows the controlled index: only the current slide is exposed to screen readers", async () => {
    const { rerender } = await render(
      <Carousel index={0} onChange={jest.fn()}>
        {slides()}
      </Carousel>
    );
    expect(screen.getByText("Welcome")).toBeOnTheScreen();
    expect(screen.queryByText("Rewards")).toBeNull();

    await rerender(
      <Carousel index={SECOND_SLIDE} onChange={jest.fn()}>
        {slides()}
      </Carousel>
    );
    expect(screen.getByText("Rewards")).toBeOnTheScreen();
    expect(screen.queryByText("Welcome")).toBeNull();
  });

  it("can hide its dots", async () => {
    await render(
      <Carousel index={0} onChange={jest.fn()} showIndicators={false}>
        {slides()}
      </Carousel>
    );
    expect(screen.queryByRole("button", { name: "Slide 1 of 3" })).toBeNull();
  });

  it("draws a card surface and smaller dots on request, merging the caller's className last", async () => {
    await render(
      <Carousel index={0} onChange={jest.fn()} variant="card" size="sm" className="mt-4 gap-4" testID="carousel">
        {slides()}
      </Carousel>
    );
    const className = String(screen.getByTestId("carousel").props.className);
    expect(className).toContain("bg-card");
    expect(className).toContain("mt-4");
    expect(className).toContain("gap-4");
    expect(className).not.toContain("gap-1");
  });

  it("adds previous / next arrows on request, each reporting its neighbour and disabled at its end", async () => {
    const onChange = jest.fn();
    const { rerender } = await render(
      <Carousel index={0} onChange={onChange} showControls>
        {slides()}
      </Carousel>
    );
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: "Next slide" }));
    expect(onChange).toHaveBeenLastCalledWith(SECOND_SLIDE);

    await rerender(
      <Carousel index={THIRD_SLIDE} onChange={onChange} showControls previousLabel="Back" nextLabel="Forward">
        {slides()}
      </Carousel>
    );
    expect(screen.getByRole("button", { name: "Forward" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(onChange).toHaveBeenLastCalledWith(SECOND_SLIDE);
  });

  it("keeps the arrows without the dots", async () => {
    await render(
      <Carousel index={0} onChange={jest.fn()} showControls showIndicators={false}>
        {slides()}
      </Carousel>
    );
    expect(screen.getByRole("button", { name: "Next slide" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Slide 1 of 3" })).toBeNull();
  });

  it("clamps an index to the slides", () => {
    expect(clampCarouselIndex(-1, SLIDE_TITLES.length)).toBe(0);
    expect(clampCarouselIndex(SECOND_SLIDE, SLIDE_TITLES.length)).toBe(SECOND_SLIDE);
    expect(clampCarouselIndex(SLIDE_TITLES.length, SLIDE_TITLES.length)).toBe(THIRD_SLIDE);
    expect(clampCarouselIndex(SECOND_SLIDE, 0)).toBe(0);
  });

  it("forwards its ref", async () => {
    const ref = React.createRef<ViewInstance>();
    await render(
      <Carousel ref={ref} index={0} onChange={jest.fn()}>
        {slides()}
      </Carousel>
    );
    expect(ref.current).not.toBeNull();
  });
});

const PEEK = 24;
const GAP = 12;
const AUTO_PLAY_MS = 4000;
/** Long enough for any pending timer to have fired. */
const LONG_WAIT_MS = AUTO_PLAY_MS * 3;

/** A screen that owns the carousel's slide, shows which one is current and lets the carousel change it. */
function OwnedCarousel(props: Partial<CarouselProps>): React.JSX.Element {
  const [index, setIndex] = React.useState(0);
  return (
    <>
      <Text>{`Showing ${String(index)}`}</Text>
      <Carousel index={index} onChange={setIndex} testID="carousel" {...props}>
        {slides()}
      </Carousel>
    </>
  );
}

async function wait(ms: number): Promise<void> {
  await act((): void => {
    jest.advanceTimersByTime(ms);
  });
}

describe("Carousel peek", () => {
  it("narrows each slide so the next one shows, and snaps slide by slide", async () => {
    await render(
      <Carousel index={0} onChange={jest.fn()} peek={PEEK} gap={GAP} testID="carousel">
        {slides()}
      </Carousel>
    );
    await fireEvent(screen.getByTestId("carousel"), "layout", {
      nativeEvent: { layout: { width: PAGE_WIDTH, height: PAGE_WIDTH, x: 0, y: 0 } },
    });

    const pager = screen.getByTestId("carousel-pager");
    expect(pager).toHaveProp("snapToInterval", PAGE_WIDTH - PEEK);
    expect(pager).not.toHaveProp("pagingEnabled");
  });

  it("settles on the slide a swipe snapped to", async () => {
    const onChange = jest.fn();
    await render(
      <Carousel index={0} onChange={onChange} peek={PEEK} gap={GAP} testID="carousel">
        {slides()}
      </Carousel>
    );
    await fireEvent(screen.getByTestId("carousel"), "layout", {
      nativeEvent: { layout: { width: PAGE_WIDTH, height: PAGE_WIDTH, x: 0, y: 0 } },
    });

    await fireEvent(screen.getByTestId("carousel-pager"), "momentumScrollEnd", {
      nativeEvent: { contentOffset: { x: THIRD_SLIDE * (PAGE_WIDTH - PEEK), y: 0 } },
    });

    expect(onChange).toHaveBeenCalledWith(THIRD_SLIDE);
  });

  it("keeps full-width slides apart by the gap, and snaps a slide plus the gap at a time", async () => {
    await render(
      <Carousel index={0} onChange={jest.fn()} gap={GAP} testID="carousel">
        {slides()}
      </Carousel>
    );
    await fireEvent(screen.getByTestId("carousel"), "layout", {
      nativeEvent: { layout: { width: PAGE_WIDTH, height: PAGE_WIDTH, x: 0, y: 0 } },
    });

    const pager = screen.getByTestId("carousel-pager");
    expect(pager).toHaveProp("snapToInterval", PAGE_WIDTH + GAP);
    expect(pager).toHaveProp("contentContainerStyle", { gap: GAP });
    expect(pager).not.toHaveProp("pagingEnabled");
  });

  it("pages full-width slides without a peek or a gap, as before", async () => {
    await render(
      <Carousel index={0} onChange={jest.fn()} testID="carousel">
        {slides()}
      </Carousel>
    );
    expect(screen.getByTestId("carousel-pager")).toHaveProp("pagingEnabled", true);
  });
});

describe("carouselSlideMetrics", () => {
  it("is the whole width per slide without a peek, stepping a slide plus any gap", () => {
    expect(carouselSlideMetrics(PAGE_WIDTH, 0, 0)).toEqual({ slideWidth: PAGE_WIDTH, interval: PAGE_WIDTH });
    expect(carouselSlideMetrics(PAGE_WIDTH, 0, GAP)).toEqual({ slideWidth: PAGE_WIDTH, interval: PAGE_WIDTH + GAP });
  });

  it("leaves room for the peek and the gap, and steps a slide plus a gap", () => {
    expect(carouselSlideMetrics(PAGE_WIDTH, PEEK, DEFAULT_CAROUSEL_GAP)).toEqual({
      slideWidth: PAGE_WIDTH - PEEK - DEFAULT_CAROUSEL_GAP,
      interval: PAGE_WIDTH - PEEK,
    });
  });

  it("never goes below zero before the carousel is measured", () => {
    expect(carouselSlideMetrics(0, PEEK, GAP).slideWidth).toBe(0);
  });
});

describe("carouselGapOf", () => {
  it("takes the caller's gap, else the default with a peek and none without", () => {
    expect(carouselGapOf(0, GAP)).toBe(GAP);
    expect(carouselGapOf(PEEK, undefined)).toBe(DEFAULT_CAROUSEL_GAP);
    expect(carouselGapOf(0, undefined)).toBe(0);
  });
});

describe("nextCarouselIndex", () => {
  it("moves on one slide, back to the first after the last", () => {
    expect(nextCarouselIndex(0, SLIDE_TITLES.length)).toBe(SECOND_SLIDE);
    expect(nextCarouselIndex(THIRD_SLIDE, SLIDE_TITLES.length)).toBe(0);
  });
});

describe("Carousel auto-play", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("moves on every interval and wraps to the first slide", async () => {
    await render(<OwnedCarousel autoPlayIntervalMs={AUTO_PLAY_MS} />);

    await wait(AUTO_PLAY_MS);
    expect(screen.getByText("Showing 1")).toBeOnTheScreen();
    await wait(AUTO_PLAY_MS);
    expect(screen.getByText("Showing 2")).toBeOnTheScreen();
    await wait(AUTO_PLAY_MS);
    expect(screen.getByText("Showing 0")).toBeOnTheScreen();
  });

  it("never moves on its own without an interval", async () => {
    await render(<OwnedCarousel />);

    await wait(LONG_WAIT_MS);

    expect(screen.getByText("Showing 0")).toBeOnTheScreen();
  });

  it("stops for good once the person swipes", async () => {
    await render(<OwnedCarousel autoPlayIntervalMs={AUTO_PLAY_MS} />);

    await fireEvent(screen.getByTestId("carousel-pager"), "scrollBeginDrag");
    await wait(LONG_WAIT_MS);

    expect(screen.getByText("Showing 0")).toBeOnTheScreen();
  });

  it("stops for good once the person picks a slide", async () => {
    await render(<OwnedCarousel autoPlayIntervalMs={AUTO_PLAY_MS} />);

    await fireEvent.press(screen.getByRole("button", { name: "Slide 3 of 3" }));
    await wait(LONG_WAIT_MS);

    expect(screen.getByText("Showing 2")).toBeOnTheScreen();
  });

  it("stays still with Reduce Motion on", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    await render(<OwnedCarousel autoPlayIntervalMs={AUTO_PLAY_MS} />);

    await wait(LONG_WAIT_MS);

    expect(screen.getByText("Showing 0")).toBeOnTheScreen();
  });
});
```

`apps/mobile/src/features/home-highlights/home-highlights.tsx`:

```tsx
// The Home screen's "Discover" carousel: a row of cards, each pointing to a part of the app
// (highlights.ts), built on the kit's generic `Carousel` (@/ui/components/carousel). Each card takes
// the full width of the row, one per page; the row moves on by itself every few seconds while Home is
// the screen in front, and stops for good once the person swipes or picks a card (the carousel's own
// rule). A card's button opens its screen the way the drawer does.

import { useIsFocused, useRouter } from "expo-router";
import * as React from "react";
import { View } from "react-native";

import { Button } from "@workspace/ui-native/components/button";
import { Carousel } from "@workspace/ui-native/components/carousel";
import { IconTile } from "@workspace/ui-native/components/icon-tile";
import { MutedText, Subheading } from "@workspace/ui-native/components/text";

import { HOME_HIGHLIGHTS, type HomeHighlight } from "./highlights";
import { HOME_HIGHLIGHTS_COPY, homeHighlightSlideLabel } from "./labels";

/** How long each card stays before the row moves on. */
export const HOME_HIGHLIGHTS_AUTO_PLAY_MS = 6000;
/**
 * How much of the next card shows at the edge, in points. 0: each card takes the full width of the row;
 * raise it (32 shows a card's edge) to hint that there is more to swipe.
 */
const PEEK = 0;
/** Space between cards, so their borders never touch while the row is swiped. */
export const HOME_HIGHLIGHTS_GAP = 16;
const FIRST_SLIDE = 0;

export function HomeHighlights(): React.JSX.Element {
  const router = useRouter();
  // Home stays mounted under its stack and behind other tabs: the row only moves while it is seen.
  const focused = useIsFocused();
  const [index, setIndex] = React.useState(FIRST_SLIDE);
  const open = React.useCallback(
    (highlight: HomeHighlight): void => {
      if (highlight.isTab) {
        router.navigate(highlight.route);
      } else {
        // `withAnchor`: the tab's first screen (Settings) goes underneath, so "back" lands on it.
        router.push(highlight.route, { withAnchor: true });
      }
    },
    [router]
  );

  return (
    <View className="gap-3" testID="home-highlights">
      <View className="gap-0.5">
        <Subheading>{HOME_HIGHLIGHTS_COPY.title}</Subheading>
        <MutedText>{HOME_HIGHLIGHTS_COPY.description}</MutedText>
      </View>
      <Carousel
        index={index}
        onChange={setIndex}
        peek={PEEK}
        gap={HOME_HIGHLIGHTS_GAP}
        autoPlayIntervalMs={focused ? HOME_HIGHLIGHTS_AUTO_PLAY_MS : undefined}
        slideLabel={homeHighlightSlideLabel}
        size="sm"
        testID="home-highlights-carousel">
        {HOME_HIGHLIGHTS.map((highlight: HomeHighlight): React.JSX.Element => (
          <HighlightCard key={highlight.key} highlight={highlight} onOpen={open} />
        ))}
      </Carousel>
    </View>
  );
}

interface HighlightCardProps {
  readonly highlight: HomeHighlight;
  readonly onOpen: (highlight: HomeHighlight) => void;
}

function HighlightCard({ highlight, onOpen }: HighlightCardProps): React.JSX.Element {
  const openThis = React.useCallback((): void => {
    onOpen(highlight);
  }, [highlight, onOpen]);
  return (
    <View
      className="flex-1 gap-3 rounded-xl border border-border bg-card p-4"
      testID={`home-highlight-${highlight.key}`}>
      <IconTile icon={highlight.icon} tone={highlight.tone} />
      <View className="flex-1 gap-1">
        <Subheading numberOfLines={1}>{highlight.title}</Subheading>
        <MutedText numberOfLines={3}>{highlight.body}</MutedText>
      </View>
      <View className="flex-row">
        <Button
          label={highlight.action}
          accessibilityLabel={`${highlight.action}: ${highlight.title}`}
          onPress={openThis}
          variant="secondary"
          size="sm"
        />
      </View>
    </View>
  );
}
```

`apps/mobile/src/features/home-highlights/__tests__/home-highlights.test.tsx` — the full-width test now lays the row
out and checks one card plus the gap per snap (`ROW_WIDTH + HOME_HIGHLIGHTS_GAP`) and the track's gap:

```tsx
// The Discover carousel inside a real (in-memory) Expo Router, so a card's button is checked by where
// the router actually ends up.

import { fireEvent, renderRouter, screen } from "expo-router/testing-library";
import * as React from "react";
import { Text } from "react-native";

import { ROUTES } from "../../../runtime/routes";
import { APP_TABS } from "../../navigation/app-tabs";
import { HOME_HIGHLIGHTS } from "../highlights";
import { HOME_HIGHLIGHTS_GAP, HomeHighlights } from "../home-highlights";
import { HOME_HIGHLIGHTS_COPY, homeHighlightSlideLabel } from "../labels";

const SECOND_POSITION = 2;
const ROW_WIDTH = 320;

function Destination({ name }: { readonly name: string }): React.JSX.Element {
  return <Text>{`At ${name}`}</Text>;
}

async function renderHome(): Promise<void> {
  await renderRouter(
    {
      index: HomeHighlights,
      analytics: (): React.JSX.Element => <Destination name="analytics" />,
      "settings/index": (): React.JSX.Element => <Destination name="settings" />,
      "settings/qr-scanner": (): React.JSX.Element => <Destination name="qr scanner" />,
      "settings/pdf-viewer": (): React.JSX.Element => <Destination name="pdf viewer" />,
      "settings/appearance": (): React.JSX.Element => <Destination name="appearance" />,
    },
    { initialUrl: ROUTES.home }
  );
}

describe("HomeHighlights", () => {
  it("shows a card per highlight, the first one in view, each with a named dot", async () => {
    await renderHome();

    expect(screen.getByText(HOME_HIGHLIGHTS_COPY.title)).toBeOnTheScreen();
    expect(screen.getByText("See your activity")).toBeOnTheScreen();
    for (const [position] of HOME_HIGHLIGHTS.entries()) {
      expect(
        screen.getByRole("button", { name: homeHighlightSlideLabel(position + 1, HOME_HIGHLIGHTS.length) })
      ).toBeOnTheScreen();
    }
  });

  it("gives each card the full width of the row, with a gap so cards never touch while swiped", async () => {
    await renderHome();
    await fireEvent(screen.getByTestId("home-highlights-carousel"), "layout", {
      nativeEvent: { layout: { width: ROW_WIDTH, height: ROW_WIDTH, x: 0, y: 0 } },
    });

    // A card is the row's full width: one card plus the gap per snap, nothing of the next card shown.
    const pager = screen.getByTestId("home-highlights-carousel-pager");
    expect(pager).toHaveProp("snapToInterval", ROW_WIDTH + HOME_HIGHLIGHTS_GAP);
    expect(pager).toHaveProp("contentContainerStyle", { gap: HOME_HIGHLIGHTS_GAP });
  });

  it("switches to a tab from its card", async () => {
    await renderHome();

    await fireEvent.press(screen.getByRole("button", { name: "Open analytics: See your activity" }));

    expect(screen).toHavePathname(ROUTES.analytics);
  });

  it("opens a screen under Settings from its card", async () => {
    await renderHome();
    await fireEvent.press(
      screen.getByRole("button", { name: homeHighlightSlideLabel(SECOND_POSITION, HOME_HIGHLIGHTS.length) })
    );

    await fireEvent.press(screen.getByRole("button", { name: "Scan a code: Scan a QR code" }));

    expect(screen).toHavePathname(ROUTES.qrScanner);
  });
});

describe("HOME_HIGHLIGHTS", () => {
  it("points every card at one of the app's screens, each card once", () => {
    const routes: ReadonlySet<string> = new Set(Object.values(ROUTES));
    for (const highlight of HOME_HIGHLIGHTS) {
      expect(routes.has(highlight.route)).toBe(true);
    }
    expect(new Set(HOME_HIGHLIGHTS.map((highlight) => highlight.key)).size).toBe(HOME_HIGHLIGHTS.length);
  });

  it("marks a card as a tab exactly when its screen is one of the tabs", () => {
    const tabRoutes: ReadonlySet<string> = new Set(APP_TABS.map((tab) => tab.route));
    for (const highlight of HOME_HIGHLIGHTS) {
      expect(highlight.isTab).toBe(tabRoutes.has(highlight.route));
    }
  });
});
```

### Test checklist additions (on a device)

1. **Home → Discover, swipe slowly:** a clear 16 pt space separates the cards the whole way; their borders never
   touch. Each card still fills the row's width when it settles, with nothing of the next card showing.
2. **Components → Carousel / ImageCarousel:** pages still touch and page exactly as before (no gap — unchanged).

### Gate results (after Updated 1)

| Command | Result |
|---|---|
| `pnpm run format` | ✅ |
| `pnpm run lint` | ✅ 0 errors, 0 warnings |
| `pnpm run typecheck` | ✅ |
| `pnpm run test` | ✅ 150 suites, 1,200 tests |
| `pnpm exec expo install --check` | ✅ up to date |
| `test:e2e` | — this repo has no end-to-end suite |

