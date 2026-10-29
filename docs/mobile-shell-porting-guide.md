# Mobile shell changes — porting guide

The changes made to this Expo app's shell and screens, written so they can be applied as they are to `apps/mobile` in the
turborepo starter kit (`nestjs-nextjs-turborepo-starter-kit`). Every path below is the starter kit's; imports use its
packages (`@workspace/ui-native/...`, `@workspace/tokens`) where this repo uses `@/ui/...` and `@/tokens`.

| # | Change | Files (in `apps/mobile/src/`) | Kind |
|---|---|---|---|
| 1 | Collapsing page header — scroll-linked, pinned menu / title / notifications | `lib/page-header-scroll.tsx` | **new** |
| 2 | Header layout and motion — title + subtitle centred between menu and bell; shrinks in place (background lifts, subtitle fades on an ease and is tucked under the edge) | `components/page-header.tsx` | replace |
| 3 | Wiring — the shell owns the scroll values, the app header reads them, a subtitle per screen | `features/app-shell/app-shell.tsx`, `features/app-shell/app-header.tsx`, `features/navigation/app-screens.ts` | replace |
| 4 | Curved content sheet under the header (the auth pages' curve) | `components/screen.tsx` | edit |
| 5 | Android edge-to-edge fix (strips above / below the app in Expo Go) | `app/_layout.tsx` | edit |
| 6 | Smooth first switch to each tab (preloading) | `features/navigation/use-preloaded-tabs.ts`, `features/navigation/app-tab-bar.tsx` | **new** + edit |
| 7 | Toasts drop in under the header's controls, not under the subtitle | `features/app-shell/app-shell.tsx` (in 3), `components/page-header.tsx` (in 2) | edit |
| 8 | Sign-in screens: light status-bar icons on the dark panel | `components/auth-shell.tsx` | edit |
| 9 | URL state on nuqs — `defineUrlState` / `useUrlState` with an Expo Router adapter | `lib/url-state/*`, `app/_layout.tsx`, `jest.config.js` | **new** + edit |
| 10 | Team members on Home — paged list (`?page=`), details page, Home as a stack | `app/(app)/(home)/*`, `features/sample-users/*`, `runtime/routes.ts`, `features/navigation/app-tabs.ts` | **new** + edit |
| 11 | Dependencies — `nuqs`, `react-native` 0.88.1 | `package.json` | edit |

**Already in the starter kit — skip:** the `index.ts` entry point with `react-native-url-polyfill`, `--clear` on
`start`, and the Jest allow-list for ES-module-only packages (`ES_MODULE_ONLY_PACKAGES` in `jest.config.js` — section 9
only adds `nuqs` to it). **Still to port:** section 1's Reanimated fix — the starter kit's `usePageHeaderProgress`
still passes `[scroll]` to `useDerivedValue`, which warns on a phone.

After pasting, run `pnpm --filter mobile run format` (the starter kit indents with tabs; the snippets here use spaces),
then the gate (`lint`, `typecheck`, `test`).

---

## How it fits together

```text
app/(app)/_layout.tsx
└─ AppShell (features/app-shell/app-shell.tsx)
   │  owns: scrollY, collapseDistance  (Reanimated shared values)
   │  provides: PageHeaderClearanceProvider (expanded header height)
   │            PageHeaderScrollProvider    ({ scrollY, collapseDistance })
   ├─ <Tabs> … every screen renders <Screen>
   │    └─ Screen (components/screen.tsx)
   │         usePageHeaderScrollHandler()  → writes scrollY (only while focused)
   │         content on a curved sheet:  rounded-t-4xl bg-card
   └─ AppHeader (features/app-shell/app-header.tsx)
        progress = clamp(scrollY / collapseDistance, 0, 1)   (usePageHeaderProgress)
        └─ PageHeader (components/page-header.tsx)
             background:    translateY = -progress × collapseDistance   (the only thing that moves)
             controls row:  never moves
             subtitle clip: translateY = -progress × collapseDistance   (overflow-hidden, rises with the edge)
             subtitle text: translateY = +progress × collapseDistance   (held in place inside the clip)
                            opacity = 1 − easeInOutQuad(progress)        (over the whole collapse)
             reports:   onHeightChange (whole header), onCollapseDistanceChange (subtitle line)
   ToastHost  top = insets.top + PAGE_HEADER_ROW_HEIGHT   (under the controls, expanded or collapsed)
```

- **Scroll-linked, not time-based.** `progress` is the focused page's scroll position divided by the subtitle line's
  height, so the header moves exactly with the content, finger for finger, on the UI thread (transforms only — no
  relayout per frame).
- **One header, many scroll views.** Each screen keeps its own position. Only the focused screen writes `scrollY`;
  when a screen gains focus it hands the header its own position (eased over 220 ms), so switching tabs never leaves a
  stale header.
- **Pinned + collapsing parts** (the same split as `react-native-header-motion`, without the library): the band moves up
  by `progress × distance` and the pinned row moves down by the same amount, so the menu, title and bell never move
  while the subtitle line slides under them and fades.

---

## 1. The scroll link — `lib/page-header-scroll.tsx` (new)

```tsx
// The page header's motion, driven by the page's scroll position. The header has two parts: a
// pinned row (menu, title, notifications) that never moves, and a subtitle line below it that
// collapses as the page scrolls. `progress` runs from 0 (expanded, at the top of the page) to 1
// (collapsed) over the subtitle line's height — scroll-linked, so the header moves exactly with the
// content, on the UI thread.
//
// The app shell owns the values and the header reads them. Every screen inside the shell feeds them
// from its own scroll view while it is the focused screen; when a screen gains focus it hands the
// header its own position, so switching pages never leaves a stale header behind.

import { useFocusEffect } from "expo-router";
import * as React from "react";
import {
  clamp,
  Easing,
  ReduceMotion,
  useAnimatedScrollHandler,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type ScrollEvent,
  type SharedValue,
  type WithTimingConfig,
} from "react-native-reanimated";

export interface PageHeaderScroll {
  /** The focused screen's scroll position, in points from the top. */
  readonly scrollY: SharedValue<number>;
  /** How far the page scrolls while the header collapses: the subtitle line's height. */
  readonly collapseDistance: SharedValue<number>;
}

const PageHeaderScrollContext = React.createContext<PageHeaderScroll | null>(null);

export const PageHeaderScrollProvider = PageHeaderScrollContext.Provider;

/** The header's scroll link while one is laid over the screen, otherwise `null`. */
export function usePageHeaderScroll(): PageHeaderScroll | null {
  return React.use(PageHeaderScrollContext);
}

const AT_TOP = 0;
const EXPANDED = 0;
const COLLAPSED = 1;
/** Guards the division before the subtitle line has been measured. */
const MIN_COLLAPSE_DISTANCE = 1;
const SYNC_DURATION_MS = 220;

/** How the header catches up with a newly focused page's scroll position: quick, instant with Reduce Motion. */
const PAGE_HEADER_SYNC_TIMING: WithTimingConfig = {
  duration: SYNC_DURATION_MS,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};

/** 0 expanded … 1 collapsed. */
export function usePageHeaderProgress(scroll: PageHeaderScroll): SharedValue<number> {
  // No dependency array: on native Reanimated tracks the worklet's captured values itself (an array is
  // web-only and warns on a phone).
  return useDerivedValue((): number =>
    clamp(scroll.scrollY.get() / Math.max(scroll.collapseDistance.get(), MIN_COLLAPSE_DISTANCE), EXPANDED, COLLAPSED)
  );
}

/**
 * Connects a screen to the header: the returned handler goes on the screen's scroll view (`onScroll`).
 * A screen that does not scroll still calls this, so the header expands when it gains focus.
 * Does nothing outside the shell.
 */
export function usePageHeaderScrollHandler(): ReturnType<typeof useAnimatedScrollHandler> {
  const scroll = usePageHeaderScroll();
  const position = useSharedValue(AT_TOP);
  const focused = useSharedValue(false);

  useFocusEffect(
    React.useCallback((): (() => void) | undefined => {
      if (scroll === null) {
        return undefined;
      }
      focused.set(true);
      scroll.scrollY.set(withTiming(position.get(), PAGE_HEADER_SYNC_TIMING));
      return (): void => {
        focused.set(false);
      };
    }, [focused, position, scroll])
  );

  return useAnimatedScrollHandler({
    onScroll: (event: ScrollEvent): void => {
      // Pull-to-refresh pulls past the top: the header stays expanded.
      const y = Math.max(event.contentOffset.y, AT_TOP);
      position.set(y);
      if (scroll !== null && focused.get()) {
        scroll.scrollY.set(y);
      }
    },
  });
}
```

Notes:

- Reanimated exports the event type as `ScrollEvent` (not `ReanimatedScrollEvent`).
- `useFocusEffect` needs a navigator above the screen: every `Screen` inside `app/(app)` has one. A Jest test that
  renders `Screen` without a navigator must wrap it in one (or mock `expo-router`'s `useFocusEffect`).

> **Reanimated fix (port this even if the rest is in):** `usePageHeaderProgress` passes **no** dependency array to
> `useDerivedValue`. On native, Reanimated tracks the worklet's captured values itself; an array is web-only and logs
> `[Reanimated] Dependencies should only be used on the web and are always ignored on native` on every render.

---

## 2. The header — `components/page-header.tsx` (replace)

Replaces the starter kit's page header. Changes from the original: page-coloured (`bg-background`, like the status bar
above it); the title is centred between the menu and the bell, with a subtitle line under it; the bell is a new
control; and the whole header takes `progress` / `collapseDistance` and reports its two heights. The title's
page-change motion (`titleDrift`) and the menu/back cross-fade are the original's.

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
// the subtitle stays where it is, fading gently while the rising edge tucks it away. Nothing in the header slides with the content: what is left is
// one slim bar with the menu, the title and notifications, exactly where they were.
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
  FadeIn,
  FadeOut,
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
      {/* The header's colour, status bar included: it rises from below as the header collapses. */}
      <StyledAnimatedView
        pointerEvents="none"
        className="absolute inset-0 bg-background"
        style={backgroundStyle}
        testID={testID === undefined ? undefined : `${testID}-background`}
      />
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

How it collapses: only the background layer moves (a `translateY` that lifts its bottom edge by the subtitle line's
height), so the content's curved top stays attached to it; the pinned row and the subtitle never move. The subtitle
line's frame rises with the edge (`overflow-hidden`) while its text is held in place by an equal and opposite shift, so
the edge tucks the text away; that lets the fade run gently over the whole collapse, on an ease. Nothing in the header
slides along with the content.

Tuning lives in the constants at the top: `SUBTITLE_FADE` (the fade's easing curve) and the classes on the
pinned row (`h-14`), the subtitle line (`px-16 pb-4`) and the title (`text-xl`). `PAGE_HEADER_ESTIMATED_HEIGHT` is only
the first frame's guess before `onLayout` — keep it close to the real height to avoid a jump.

> The starter kit's original header had a `trailing` slot for the app-status pills (network, session timer). This
> version replaces that slot with the notifications button. To keep the pills, put them back as a `trailing` prop
> beside the bell.

---

## 3. Wiring

### `features/app-shell/app-shell.tsx` (replace)

The shell owns the two shared values, measures the header and gives every screen the clearance (how far the expanded
header reaches) and the scroll link.

```tsx
// The frame of every signed-in screen (ADR 046): the app drawer (ADR 038), the toasts confirming what
// actions did (ADR 047) and, laid over the screens, the shared page header — menu or
// back, notifications, and the page's title and subtitle. All of
// it is rendered once for the whole (app) group and never re-mounts as screens
// change; the screens learn the header's height from PageHeaderClearance and
// start their content below it.

import * as React from "react";
import { View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PAGE_HEADER_ESTIMATED_HEIGHT, PAGE_HEADER_ROW_HEIGHT } from "../../components/page-header";
import { PageHeaderClearanceProvider } from "../../lib/page-header-clearance";
import { PageHeaderScrollProvider, type PageHeaderScroll } from "../../lib/page-header-scroll";
import { AppDrawerStoreProvider } from "../app-drawer/facade";
import { createAppDrawerStore } from "../app-drawer/store";
import { ToastStoreProvider } from "../toast/facade";
import { createToastStore } from "../toast/store";
import { ToastHost } from "../toast/toast-host";
import { AppDrawer } from "../navigation/app-drawer";
import { AppHeader } from "./app-header";

export interface AppShellProps {
  /** The navigator of the signed-in screens. */
  readonly children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps): React.JSX.Element {
  // The drawer's store lives as long as the shell: signing out unmounts it, so the drawer starts closed next time.
  const [drawerStore] = React.useState(createAppDrawerStore);
  const [toastStore] = React.useState(createToastStore);
  const insets = useSafeAreaInsets();
  // The header's measured height (status bar included); estimated until its first layout.
  const [headerHeight, setHeaderHeight] = React.useState<number | null>(null);
  const headerBottom = headerHeight ?? insets.top + PAGE_HEADER_ESTIMATED_HEIGHT;
  // Toasts drop in just under the header's controls (the pinned row), right below the bell — not under
  // the subtitle line, which is gone once the header collapses and would leave a gap above the toast.
  const toastTop = insets.top + PAGE_HEADER_ROW_HEIGHT;
  // The header's scroll link (src/lib/page-header-scroll.tsx): the focused page's scroll position and
  // how far the header collapses over it.
  const scrollY = useSharedValue(0);
  const collapseDistance = useSharedValue(0);
  const headerScroll = React.useMemo(
    (): PageHeaderScroll => ({ scrollY, collapseDistance }),
    [scrollY, collapseDistance]
  );
  const reportCollapseDistance = React.useCallback(
    (distance: number): void => {
      collapseDistance.set(distance);
    },
    [collapseDistance]
  );
  return (
    <AppDrawerStoreProvider store={drawerStore}>
      <ToastStoreProvider store={toastStore}>
        <AppDrawer>
          <PageHeaderClearanceProvider value={headerBottom}>
            <PageHeaderScrollProvider value={headerScroll}>
              <View className="flex-1">
                {children}
                <AppHeader
                  scroll={headerScroll}
                  onHeightChange={setHeaderHeight}
                  onCollapseDistanceChange={reportCollapseDistance}
                />
                <ToastHost top={toastTop} />
              </View>
            </PageHeaderScrollProvider>
          </PageHeaderClearanceProvider>
        </AppDrawer>
      </ToastStoreProvider>
    </AppDrawerStoreProvider>
  );
}
```

> The starter kit's shell also renders the app-status pills (`trailing`) and passes the header's
> `PAGE_HEADER_FADE_HEIGHT`; the content's clearance is the measured height here instead. `PAGE_HEADER_ROW_HEIGHT`
> stays, for one job: where the toasts drop in (just under the controls row, the same place expanded or collapsed).

### `features/app-shell/app-header.tsx` (replace)

Connects the header to the router, the drawer, the toasts and the scroll link. The status bar's icons follow the
theme, because the header is the page's colour.

```tsx
// The app shell's header (ADR 046): the page header connected to the app. The title and subtitle come
// from the current path (features/navigation/app-screens.ts) and move the way the page does
// (header-transition.ts); a tab's first screen leads with the menu, a screen deeper in a stack leads
// with back. The header collapses with the page's scrolling (src/lib/page-header-scroll.tsx) into a
// slim bar that keeps the menu, the title and notifications. The app draws edge to edge and the header
// is the page's colour, so the status bar's icons follow the theme: dark on a light page, light on a dark one.

import { usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUniwind } from "uniwind";

import { isDarkTheme } from "@workspace/tokens";

import { PageHeader } from "../../components/page-header";
import { usePageHeaderProgress, type PageHeaderScroll } from "../../lib/page-header-scroll";
import { useAppDrawerCommands } from "../app-drawer/facade";
import { screenHeadingOf } from "../navigation/app-screens";
import { isTabRoot } from "../navigation/drawer-destinations";
import { headerTitleDriftOf } from "../navigation/header-transition";
import { useToast } from "../toast/facade";

interface PathChange {
  readonly path: string;
  readonly drift: number;
}

const NO_DRIFT = 0;
const NOTIFICATIONS_PLACEHOLDER = "Notifications are coming soon.";

export interface AppHeaderProps {
  /** The header's scroll link, owned by the shell. */
  readonly scroll: PageHeaderScroll;
  /** Reports the header's full expanded height, status bar included. */
  readonly onHeightChange: (height: number) => void;
  /** Reports how far the header collapses: its subtitle line's height. */
  readonly onCollapseDistanceChange: (distance: number) => void;
}

export function AppHeader({ scroll, onHeightChange, onCollapseDistanceChange }: AppHeaderProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const drawer = useAppDrawerCommands();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { theme } = useUniwind();
  const [change, setChange] = React.useState<PathChange>({ path: pathname, drift: NO_DRIFT });
  if (change.path !== pathname) {
    // Which way the title moves depends on where the page came from: adjusted during render, from the previous path.
    setChange({ path: pathname, drift: headerTitleDriftOf(change.path, pathname) });
  }
  const goBack = React.useCallback((): void => {
    router.back();
  }, [router]);
  const openNotifications = React.useCallback((): void => {
    toast.info(NOTIFICATIONS_PLACEHOLDER);
  }, [toast]);
  const heading = screenHeadingOf(pathname);

  const progress = usePageHeaderProgress(scroll);

  return (
    <>
      <StatusBar style={isDarkTheme(theme) ? "light" : "dark"} />
      <PageHeader
        title={heading.title}
        subtitle={heading.subtitle}
        titleKey={pathname}
        titleDrift={change.drift}
        leading={isTabRoot(pathname) ? "menu" : "back"}
        onMenu={drawer.opened}
        onBack={goBack}
        onNotifications={openNotifications}
        topInset={insets.top}
        progress={progress}
        collapseDistance={scroll.collapseDistance}
        onHeightChange={onHeightChange}
        onCollapseDistanceChange={onCollapseDistanceChange}
        testID="app-header"
      />
    </>
  );
}
```

The starter kit's `screenTitleOf(pathname, params)` resolves titles for parameterised routes too (pull requests,
commits). Keep those entries when porting `app-screens.ts` below — give each one a subtitle.

### `features/navigation/app-screens.ts` (replace — title + subtitle per screen)

```ts
// What the app header calls each signed-in screen — one entry per route of the (app) group, in the
// screens' own words: the title, and the one line under it saying what the page is for. The header
// resolves both from the path the moment it changes, so the new title moves in step with the page
// instead of a frame after it.

import { ROUTES, TEAM_MEMBER_PATH, type AppRoute } from "../../runtime/routes";
import { PDF_VIEWER_TITLE } from "../pdf-viewer/labels";
import { QR_SCANNER_TITLE } from "../qr-scanner/labels";
import { SAMPLE_USER_DETAILS_SUBTITLE, SAMPLE_USER_DETAILS_TITLE } from "../sample-users/labels";
import { APP_TABS, type AppTab } from "./app-tabs";
import { SCREEN_TITLES } from "./screen-titles";

export interface ScreenHeading {
  readonly title: string;
  readonly subtitle: string;
}

/** Each tab's subtitle; the tab's title comes from APP_TABS. */
const TAB_SUBTITLES: Readonly<Record<AppTab["name"], string>> = {
  "(home)": "Your account at a glance",
  analytics: "Your activity over time",
  search: "Find anything in the app",
  profile: "Your personal details",
  settings: "Manage your preferences and account",
};

const SUB_SCREEN_HEADINGS: readonly (readonly [AppRoute, ScreenHeading])[] = [
  [ROUTES.security, { title: SCREEN_TITLES.security, subtitle: "Your password and sign-in" }],
  [ROUTES.devices, { title: SCREEN_TITLES.devices, subtitle: "Where your account is signed in" }],
  [ROUTES.appearance, { title: SCREEN_TITLES.appearance, subtitle: "Choose how the app looks" }],
  [ROUTES.pdfViewer, { title: PDF_VIEWER_TITLE, subtitle: "Open and read PDF documents" }],
  [ROUTES.qrScanner, { title: QR_SCANNER_TITLE, subtitle: "Scan a code with your camera" }],
  [ROUTES.components, { title: SCREEN_TITLES.components, subtitle: "The UI kit, live" }],
];

const HEADINGS: ReadonlyMap<string, ScreenHeading> = new Map<string, ScreenHeading>([
  ...APP_TABS.map((tab: AppTab): [string, ScreenHeading] => [
    tab.route,
    { title: tab.title, subtitle: TAB_SUBTITLES[tab.name] },
  ]),
  ...SUB_SCREEN_HEADINGS,
]);

interface DynamicHeading {
  readonly path: RegExp;
  readonly heading: ScreenHeading;
}

/** Screens whose path carries an id ("/team/3"): matched by pattern, after the fixed paths. */
const DYNAMIC_HEADINGS: readonly DynamicHeading[] = [
  { path: TEAM_MEMBER_PATH, heading: { title: SAMPLE_USER_DETAILS_TITLE, subtitle: SAMPLE_USER_DETAILS_SUBTITLE } },
];

const NO_HEADING: ScreenHeading = { title: "", subtitle: "" };

/** The heading of the screen at `pathname`; empty for a path the app does not have. */
export function screenHeadingOf(pathname: string): ScreenHeading {
  const heading = HEADINGS.get(pathname);
  if (heading !== undefined) {
    return heading;
  }
  const dynamic = DYNAMIC_HEADINGS.find(({ path }): boolean => path.test(pathname));
  return dynamic?.heading ?? NO_HEADING;
}
```

The `(home)` key and the `DYNAMIC_HEADINGS` / `TEAM_MEMBER_PATH` part come with section 10; leave them out if you
don't port the team members screens (then keep the `index` key and `return HEADINGS.get(pathname) ?? NO_HEADING`).

---

## 4. Curved content sheet — `components/screen.tsx` (edit)

Inside the shell the content sits on a `bg-card` sheet with the auth pages' `rounded-t-4xl` curve, on the page
colour, starting right under the header. The scroll view becomes Reanimated's, so the header can follow it. Diff
against the starter kit's file:

```diff
 import * as React from "react";
-import { RefreshControl, ScrollView, View } from "react-native";
+import { RefreshControl, View } from "react-native";
+import Animated from "react-native-reanimated";
 import { SafeAreaView } from "react-native-safe-area-context";
 import { withUniwind } from "uniwind";

 import { KeyboardAvoidingView } from "@workspace/ui-native/components/keyboard-avoiding-view";

 import { usePageHeaderClearance } from "../lib/page-header-clearance";
+import { usePageHeaderScrollHandler } from "../lib/page-header-scroll";
 import { useKeyboardVisible } from "../lib/use-keyboard-visible";
 import { useTabBarClearance } from "../lib/use-tab-bar-clearance";
 import { Heading, MutedText } from "@workspace/ui-native/components/text";
@@
 const StyledSafeAreaView = withUniwind(SafeAreaView);
+/** Reanimated's scroll view, so the page header can follow the scrolling on the UI thread. */
+const StyledScrollView = withUniwind(Animated.ScrollView);
+
+/** Scroll events per second the header follows (one per frame). */
+const SCROLL_EVENT_THROTTLE_MS = 16;
@@
 	// Inside the app shell the header covers the top (status bar included): the content starts below it.
 	const headerClearance = usePageHeaderClearance();
+	const onScroll = usePageHeaderScrollHandler();
 	const hasHeader = headerClearance !== null;
@@
 			{tabBarClearance > 0 ? <View style={clearanceStyle} testID="tab-bar-clearance" /> : null}
 		</>
 	);
+	// Inside the shell the content sits on a sheet with a curved top, under the header — the same curve
+	// as the auth pages' (components/auth-shell.tsx). Outside it, the content sits on the page.
+	const page = hasHeader ? <View className="grow gap-5 rounded-t-4xl bg-card px-5 py-6">{content}</View> : content;
@@
 					{scrollable ? (
-						<ScrollView
+						<StyledScrollView
+							onScroll={onScroll}
+							scrollEventThrottle={SCROLL_EVENT_THROTTLE_MS}
 							testID={testID === undefined ? undefined : `${testID}-content`}
 							keyboardShouldPersistTaps="handled"
 							scrollIndicatorInsets={scrollIndicatorInsets}
-							contentContainerClassName="grow gap-5 px-5 py-6"
+							contentContainerClassName={hasHeader ? "grow" : "grow gap-5 px-5 py-6"}
 							contentContainerStyle={headerClearanceStyle}
@@
-							{content}
-						</ScrollView>
+							{page}
+						</StyledScrollView>
 					) : (
-						<View testID={testID === undefined ? undefined : `${testID}-content`} className="flex-1 gap-5 px-5 py-6" style={headerClearanceStyle}>
-							{content}
+						<View
+							testID={testID === undefined ? undefined : `${testID}-content`}
+							className={hasHeader ? "flex-1" : "flex-1 gap-5 px-5 py-6"}
+							style={headerClearanceStyle}>
+							{page}
 						</View>
 					)}
```

- The padding moves from the scroll container onto the sheet, so the sheet's curve starts exactly at the header's
  bottom edge (`paddingTop = headerClearance`, no extra gap).
- Cards (`rounded-xl border border-border bg-card`) keep their border, so they still separate on a `bg-card` sheet.
- In the light theme the step between `--background` and `--card` is subtle. For a stronger curve, darken the page
  colour under the header only — never the status bar strip, which must stay the page colour.

---

## 5. Android edge-to-edge fix — `app/_layout.tsx` (edit)

**Symptom (Expo Go, Android):** page-coloured strips above and below the app that nothing can draw over — the
drawer, its scrim and blur stop short of the status bar and the gesture bar, and the header never reaches behind the
clock and battery.

**Cause:** `react-native-keyboard-controller`'s `KeyboardProvider` wraps the whole app. On Android it decides whether
the app is edge-to-edge with `react-native-is-edge-to-edge`, which reads a React Native constant
(`DeviceInfo.isEdgeToEdge`) that **Expo Go does not set**. It concludes "not edge-to-edge" and pads the root view away
from both system bars. Expo SDK 58 is always edge-to-edge on Android, so tell the provider:

```tsx
// The app draws edge to edge (Expo SDK 58 makes it mandatory on Android), so the provider is told the
// system bars are translucent. Its own edge-to-edge detection reads a React Native constant that Expo
// Go does not set: left to itself it pads the whole app away from the status bar and the navigation
// bar, leaving page-coloured strips that nothing (the header, the drawer, its scrim) can cover.

export default function RootLayout(): React.JSX.Element {
  // …
  return (
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
      {/* the app, unchanged */}
    </KeyboardProvider>
  );
}
```

After this, `useSafeAreaInsets()` reports the real top and bottom insets on Android, so the drawer panel, the header
and the floating tab bar all sit correctly with no other change. (Reanimated is the only other library here using the
same detection, and only for `useAnimatedKeyboard`.)

---

## 6. Smooth first tab switch — preloading the tabs

**Symptom:** the first switch to each tab stutters (most on Analytics, with its charts); later switches are smooth.
Tabs mount lazily, so a tab's screen is first rendered during the tab transition.

### `features/navigation/use-preloaded-tabs.ts` (new)

```ts
// Tabs mount lazily: a tab's screen is first rendered the moment it is first opened, during the tab
// transition, so the first switch to a heavy tab (Analytics' charts) stutters while every later one
// is smooth. This preloads every tab once the app is idle after the tabs appear — one tab per idle
// callback, so the first screen's own frames are never competed with — and the first switch then
// only animates an already-rendered screen.

import { useRouter } from "expo-router";
import * as React from "react";

import { APP_TABS, type AppTab } from "./app-tabs";

export function usePreloadedTabs(): void {
  const router = useRouter();

  React.useEffect((): (() => void) => {
    const pending: AppTab[] = [...APP_TABS];
    let handle = requestIdleCallback(preloadNext);

    function preloadNext(): void {
      const tab = pending.shift();
      if (tab === undefined) {
        return;
      }
      router.prefetch(tab.route);
      handle = requestIdleCallback(preloadNext);
    }

    return (): void => {
      cancelIdleCallback(handle);
    };
  }, [router]);
}
```

### `features/navigation/app-tab-bar.tsx` (edit)

```diff
 import { useKeyboardVisible } from "../../lib/use-keyboard-visible";
 import { appTabOf } from "./app-tabs";
+import { usePreloadedTabs } from "./use-preloaded-tabs";

 export function AppTabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps): React.JSX.Element | null {
 	const keyboardVisible = useKeyboardVisible();
+	usePreloadedTabs();
```

`router.prefetch(href)` is Expo Router's preload (React Navigation's `navigation.preload`): the screen renders in the
background and the first visit only animates it.

---

## 7. Toasts under the header's controls (in sections 2 and 3)

The toast used to drop in at the bottom of the **expanded** header — a whole subtitle line below the bell that opened
it, and with a gap above it once the header collapsed (the subtitle line is gone but the toast stayed as low). It now
sits under the pinned controls row, which never moves, so it is in the same place expanded or collapsed:

```tsx
// components/page-header.tsx
export const PAGE_HEADER_ROW_HEIGHT = 56; // the pinned row (`h-14`) — keep the two in step

// features/app-shell/app-shell.tsx
const toastTop = insets.top + PAGE_HEADER_ROW_HEIGHT;
// …
<ToastHost top={toastTop} />
```

A test keeps the constant and the row's `h-14` in step (`components/__tests__/page-header.test.tsx`, below).

## 8. Sign-in screens: light status-bar icons — `components/auth-shell.tsx` (edit)

The auth panel is dark in every theme, but nothing on the signed-out screens set the status bar's style, so the root's
`style="auto"` gave dark icons on the light theme — the time and battery all but vanished. The auth shell now asks for
light icons (the launch screen and the app header set their own):

```diff
+import { StatusBar } from "expo-status-bar";
 import * as React from "react";
 …
     <StyledSafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-auth-panel" testID={testID}>
+      <StatusBar style="light" />
```

Its test (`components/__tests__/auth-shell.test.tsx`) spies on `StatusBar.pushStackEntry` — React Native's
`StatusBar` renders nothing, so its requested style is what the test reads:

```tsx
import { render, screen } from "@testing-library/react-native";
import * as React from "react";
import { StatusBar, Text } from "react-native";

import { AppProviders } from "../../../test/app-harness";
import { AuthShell } from "../auth-shell";

describe("AuthShell", () => {
  it("shows the brand and the screen it frames", async () => {
    await render(
      <AppProviders>
        <AuthShell brandName="Acme" tagline="Sign in to pick up where you left off.">
          <Text>Welcome back</Text>
        </AuthShell>
      </AppProviders>
    );

    expect(screen.getByRole("header", { name: "Acme" })).toBeOnTheScreen();
    expect(screen.getByText("Welcome back")).toBeOnTheScreen();
  });

  it("asks for light status-bar icons, since the panel behind them is dark in every theme", async () => {
    const pushStatusBarStyle = jest.spyOn(StatusBar, "pushStackEntry");

    await render(
      <AppProviders>
        <AuthShell brandName="Acme" tagline="Sign in to pick up where you left off.">
          <Text>Welcome back</Text>
        </AuthShell>
      </AppProviders>
    );

    expect(pushStatusBarStyle).toHaveBeenCalledWith(expect.objectContaining({ barStyle: "light-content" }));
  });
});
```

## 9. URL state on nuqs — `lib/url-state/` (new)

The web's `@workspace/client/lib/url-state` API (`defineUrlState` + `useUrlState`, rules/03 "URL state") on mobile.
Screens never import nuqs. nuqs has no Expo Router adapter, so this adds one on its custom-adapter API.

| File | What it is |
|---|---|
| `lib/url-state/url-state.ts` | `defineUrlState` (zod per param, never throws, defaults left out of the URL) + param builders. **In the starter kit, copy `packages/client/src/lib/url-state/url-state.ts` as it is** — it is router-free and its imports (`zod`, `@workspace/shared`) are already mobile dependencies. Add the `pageUrlParam` / `FIRST_PAGE` builder below to it (or next to it). This repo's copy, shown below, replaces the two `@workspace/shared` helpers with `[value].flat()` because its vendored `shared` lacks them. |
| `lib/url-state/use-url-state.ts` | `useUrlState(codec)` → `[state, update]` on nuqs `useQueryStates`. The web version's Back/Forward address-bar sync is left out (no address bar). |
| `lib/url-state/url-state-provider.tsx` | The Expo Router adapter, mounted once in the root layout. |
| `lib/url-state/url-state-test-provider.tsx` | An in-memory engine for component tests. |

How the adapter behaves:

- **Per screen.** Reads `useLocalSearchParams()` and writes with that screen's `navigation.replaceParams` — a screen
  kept mounted under another (a stack) or in another tab never sees someone else's query.
- **`replaceParams`, not `setParams`.** `setParams` merges, so clearing a param leaves `?page=undefined` in the route.
  nuqs hands over the whole next query, and a leaf screen's params are its path params and query together, so
  replacing them is exact (`[id]` carries through).
- **`pathname` + `getSearchParamsSnapshot` are required.** Without them nuqs falls back to the browser's `location`,
  which React Native does not have (`ReferenceError: location is not defined`).
- **History.** Expo Router has no shallow history push: `"push"` and `"replace"` both write the params in place, so
  Back leaves the screen instead of stepping through pages. The option stays so code reads like its web twin.
- **Not persistence.** URL state is for deep links and shareable state; an app restart opens the launch URL.

### `lib/url-state/url-state.ts` (this repo's copy)

```ts
// ============================================
// lib/url-state/url-state.ts - typed, zod-parsed URL search-param state
// ============================================
// Shareable, deep-linkable state (a list's page, sort, filters and search; an in-screen selection
// such as `?tab=`) belongs in the route's URL — not in Zustand and not in `useState` (rules/06).
// The mobile port of the web's `@workspace/client/lib/url-state` (rules/03, "URL state"): the same
// API, so a screen's URL state reads the same on both platforms.
//
// `defineUrlState` declares that state ONCE as a zod shape, one schema per param. The same
// definition is used:
//   - by `useUrlState` (./use-url-state), to read the screen's search params and write patches back;
//   - by any code that builds a link to the screen (`codec.href(...)`), so a deep link lands on
//     exactly the state it names.
//
// Every param is untrusted input (a deep link can carry anything). Parsing NEVER throws: a missing,
// malformed or out-of-range value falls back to that param's default, independently of the other
// params. Serializing omits params whose value equals the default, so a screen in its default state
// has a clean URL with no query string at all.
//
// This module is router-free: it knows nothing about Expo Router or nuqs.

import { z } from "zod";

/** A value one URL search param holds once parsed. */
export type UrlParamValue = string | number | boolean | undefined;

/**
 * One URL search param: a zod schema that parses the raw string (or its absence) into a typed value.
 * It MUST also accept `undefined` — that result is the param's default — so wrap it with
 * `.catch(default)`, `.default(...)` or `.optional()`; `defineUrlState` rejects a shape that has no default.
 */
export type UrlParamSchema<T extends UrlParamValue> = z.ZodType<T>;

/** A URL-state declaration: state field name → param schema. */
export type UrlStateShape = Readonly<Record<string, UrlParamSchema<UrlParamValue>>>;

/** The typed state a shape parses to. */
export type UrlState<TShape extends UrlStateShape> = z.output<z.ZodObject<z.util.Writeable<TShape>>>;

/** Search params as Expo Router hands them to a screen (`useLocalSearchParams()`): a repeated key is an array. */
export type SearchParamsRecord = Readonly<Record<string, string | readonly string[] | undefined>>;

/** Anything search params can be read from: `URLSearchParams` or a screen's params record. */
export type UrlSearchSource = URLSearchParams | SearchParamsRecord;

export interface UrlStateOptions<TShape extends UrlStateShape> {
  /** The URL key of a field when it differs from the field name (`{ status: "filter[status]" }`). */
  readonly urlKeys?: Readonly<Partial<Record<keyof TShape & string, string>>>;
}

export interface UrlStateCodec<TShape extends UrlStateShape> {
  /** The state of a URL that carries none of this codec's params. */
  readonly defaults: UrlState<TShape>;
  /** Every URL key this codec owns (other keys in the URL are left untouched). */
  readonly urlKeys: readonly string[];
  /** Parses search params into typed state. Never throws: each invalid or missing param falls back to its default. */
  readonly parse: (source: UrlSearchSource) => UrlState<TShape>;
  /**
   * Serializes `state` into a query string (no leading `?`). Params equal to their default are
   * omitted. Keys of `current` that this codec does not own are kept, so two codecs (or unrelated
   * params) can share one URL.
   */
  readonly serialize: (state: UrlState<TShape>, current?: UrlSearchSource) => string;
  /** `pathname` + the serialized query (`/?page=2`), or the bare pathname for a default state. */
  readonly href: (pathname: string, state: UrlState<TShape>, current?: UrlSearchSource) => string;
}

/** The page a list opens on. */
export const FIRST_PAGE = 1;

/** Validates a state object back into plain param values for serialization (state values are always `UrlParamValue`s). */
const UrlParamRecordSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.undefined()]));

/** Raised when a URL-state declaration is invalid — a programming error found at module load, never caused by user input. */
export class InvalidUrlStateDefinitionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InvalidUrlStateDefinitionError";
  }
}

/** A mutable copy of `source` as `URLSearchParams` (repeated keys preserved). */
export function toUrlSearchParams(source: UrlSearchSource | undefined): URLSearchParams {
  if (source === undefined) {
    return new URLSearchParams();
  }
  if (source instanceof URLSearchParams) {
    return new URLSearchParams(source);
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) {
      continue;
    }
    // One value or several (a repeated key): `flat` lists them either way.
    for (const item of [value].flat()) {
      params.append(key, item);
    }
  }
  return params;
}

/** The first value of a param, or `undefined` when it is absent (repeated keys keep the first, like `URLSearchParams.get`). */
export function readSearchParam(source: UrlSearchSource, key: string): string | undefined {
  return toUrlSearchParams(source).get(key) ?? undefined;
}

/**
 * `URLSearchParams#toString()` with brackets left readable (`filter[status]=locked` instead of
 * `filter%5Bstatus%5D=locked`). Brackets are valid in a query string and every parser reads both forms.
 */
export function formatQueryString(params: URLSearchParams): string {
  return params.toString().replaceAll("%5B", "[").replaceAll("%5D", "]");
}

/** Two query strings carry the same params in the same order (encoding differences ignored). */
export function isSameQuery(left: string, right: string): boolean {
  return new URLSearchParams(left).toString() === new URLSearchParams(right).toString();
}

/** A parsed value → its URL text, or `undefined` when it should not appear in the URL (absent, or an empty string). */
function formatParamValue(value: UrlParamValue): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const text = String(value);
  return text.length > 0 ? text : undefined;
}

/**
 * Declares a URL state. Each field parses independently, so one bad param never resets the others.
 *
 * ```ts
 * export const TEAM_URL_STATE = defineUrlState({ page: urlParamWithDefault(PageNumberSchema, 1) });
 * const [{ page }, updateUrlState] = useUrlState(TEAM_URL_STATE); // in the screen
 * router.push(TEAM_URL_STATE.href("/", { page: 2 }));               // a link to page 2
 * ```
 */
export function defineUrlState<TShape extends UrlStateShape>(
  shape: TShape,
  options: UrlStateOptions<TShape> = {}
): UrlStateCodec<TShape> {
  const objectSchema = z.object(shape);
  const fieldNames: readonly (keyof TShape & string)[] = Object.keys(shape).filter(
    (name: string): name is keyof TShape & string => Object.hasOwn(shape, name)
  );
  const urlKeyOf = (name: keyof TShape & string): string => options.urlKeys?.[name] ?? name;

  const urlKeys: readonly string[] = fieldNames.map(urlKeyOf);
  const duplicates: readonly string[] = urlKeys.filter(
    (key: string, position: number): boolean => urlKeys.indexOf(key) !== position
  );
  if (duplicates.length > 0) {
    throw new InvalidUrlStateDefinitionError(
      `defineUrlState: several fields map to the same URL key: ${duplicates.join(", ")}`
    );
  }

  // Every field is passed explicitly (absent → `undefined`) so the parsed state always carries every
  // key — zod drops absent optional keys, and a missing key would make `{ ...state, ...patch }` lie.
  const toObjectInput = (accepted: ReadonlyMap<string, string>): Record<string, string | undefined> =>
    Object.fromEntries(fieldNames.map((name: string): [string, string | undefined] => [name, accepted.get(name)]));

  const parsedDefaults = objectSchema.safeParse(toObjectInput(new Map<string, string>()));
  if (!parsedDefaults.success) {
    const fields: string = parsedDefaults.error.issues.map((issue): string => issue.path.join(".")).join(", ");
    throw new InvalidUrlStateDefinitionError(
      `defineUrlState: field(s) ${fields} need a default for an absent param — use .catch(…), .default(…) or .optional()`
    );
  }
  const defaults: UrlState<TShape> = parsedDefaults.data;
  const encodedDefaults: Readonly<Record<string, UrlParamValue>> = UrlParamRecordSchema.parse(defaults);

  const parse = (source: UrlSearchSource): UrlState<TShape> => {
    // Keep only the raw values their own schema accepts; every other field then parses as absent and takes its default.
    const accepted = new Map<string, string>();
    for (const name of fieldNames) {
      const raw: string | undefined = readSearchParam(source, urlKeyOf(name));
      const fieldSchema: UrlParamSchema<UrlParamValue> | undefined = shape[name];
      if (raw !== undefined && fieldSchema?.safeParse(raw).success === true) {
        accepted.set(name, raw);
      }
    }
    const parsed = objectSchema.safeParse(toObjectInput(accepted));
    return parsed.success ? parsed.data : defaults;
  };

  const serialize = (state: UrlState<TShape>, current?: UrlSearchSource): string => {
    const params: URLSearchParams = toUrlSearchParams(current);
    const encoded: Readonly<Record<string, UrlParamValue>> = UrlParamRecordSchema.parse(state);
    for (const name of fieldNames) {
      params.delete(urlKeyOf(name));
    }
    for (const name of fieldNames) {
      const value: string | undefined = formatParamValue(encoded[name]);
      if (value !== undefined && value !== formatParamValue(encodedDefaults[name])) {
        params.set(urlKeyOf(name), value);
      }
    }
    return formatQueryString(params);
  };

  const href = (pathname: string, state: UrlState<TShape>, current?: UrlSearchSource): string => {
    const query: string = serialize(state, current);
    return query.length > 0 ? `${pathname}?${query}` : pathname;
  };

  return { defaults, urlKeys, parse, serialize, href };
}

// ── Param builders ─────────────────────────────────────────────────────────

/** An optional param: the value when `schema` accepts it, otherwise absent (`undefined`). */
export function optionalUrlParam<T extends string | number | boolean>(
  schema: z.ZodType<T>
): UrlParamSchema<T | undefined> {
  return schema.optional().catch(undefined);
}

/** A param with a default: the value when `schema` accepts it, otherwise `fallback`. */
export function urlParamWithDefault<T extends string | number | boolean>(
  schema: z.ZodType<T>,
  fallback: T
): UrlParamSchema<T> {
  return schema.catch(fallback);
}

/** `"true"` / `"false"` → boolean; anything else → absent. */
export function optionalBooleanUrlParam(): UrlParamSchema<boolean | undefined> {
  return z
    .enum(["true", "false"])
    .transform((value: "true" | "false"): boolean => value === "true")
    .optional()
    .catch(undefined);
}

/** A 1-based page number: digits only, at least 1 (`"2"` → 2); anything else falls back to the first page. */
export function pageUrlParam(): UrlParamSchema<number> {
  return urlParamWithDefault(
    z
      .string()
      .regex(/^[1-9]\d*$/)
      .transform((page: string): number => Number(page)),
    FIRST_PAGE
  );
}
```

### `lib/url-state/use-url-state.ts` (new)

```ts
// ============================================
// lib/url-state/use-url-state.ts - read/write a URL state from a screen
// ============================================
// `useUrlState(codec)` returns `[state, update]`:
//   - `state` is the codec's zod parse of the screen's search params, so it is correct on a deep
//     link and whenever the params change — there is no copy to keep in sync.
//   - `update(patch)` merges `patch` into the CURRENT URL state and writes the result back to the
//     screen's params.
//
// The engine is nuqs (`useQueryStates`, mounted by `UrlStateProvider` on Expo Router):
//   - An update changes `state` in the SAME render as the press that caused it — every hook reading
//     those keys re-renders at once — and the route's params follow on the next tick.
//   - Several updates in the same tick (a filter change followed by "back to page 1") are applied on
//     top of each other (the updater sees the queued values), then written as one change.
//
// The codec stays the single declaration of the state (zod per param); nuqs only carries each owned
// key's raw string. Screens never import nuqs (rules/03, "URL state").
//
// History: on the web, `"push"` adds a browser history entry and `"replace"` overwrites it. Expo
// Router has no shallow history push, so on a phone both write the screen's params in place — the
// back button leaves the screen, as people expect, instead of stepping back through its pages. The
// option is kept so a screen's code reads the same as its web twin's.

import { parseAsString, useQueryStates } from "nuqs";
import * as React from "react";

import type { UrlState, UrlStateCodec, UrlStateShape } from "./url-state";

/** How an update is recorded in history (see the header: the same on a phone). */
export type UrlHistoryMode = "push" | "replace";

export interface UrlStateUpdateOptions {
  /** `"push"` (default) or `"replace"`. */
  readonly history?: UrlHistoryMode;
}

/** Merges `patch` into the current URL state and writes it; a patch that changes nothing is a no-op. */
export type UrlStateUpdate<TState> = (patch: Partial<TState>, options?: UrlStateUpdateOptions) => void;

/** Each URL key a codec owns → its raw value (`null` when absent). */
export type RawUrlParams = Readonly<Record<string, string | null>>;

/** The raw values as search params (absent keys left out), for `codec.parse`. */
export function rawUrlParamsToSearch(raw: RawUrlParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (value !== null) {
      params.set(key, value);
    }
  }
  return params;
}

/** `state` as the raw value of each URL key the codec owns (`null` for a param serialized away as its default). */
export function urlStateToRawParams<TShape extends UrlStateShape>(
  codec: UrlStateCodec<TShape>,
  state: UrlState<TShape>
): RawUrlParams {
  const params = new URLSearchParams(codec.serialize(state));
  return Object.fromEntries(codec.urlKeys.map((key: string): [string, string | null] => [key, params.get(key)]));
}

/** The two raw value sets carry the same value for every key of `next`. */
export function isSameRawUrlParams(current: RawUrlParams, next: RawUrlParams): boolean {
  return Object.entries(next).every(([key, value]): boolean => (current[key] ?? null) === value);
}

/** `[state, update]` for one URL state declared with `defineUrlState`. */
export function useUrlState<TShape extends UrlStateShape>(
  codec: UrlStateCodec<TShape>
): readonly [UrlState<TShape>, UrlStateUpdate<UrlState<TShape>>] {
  // One raw string parser per owned key: the codec, not nuqs, decides what a value means.
  const rawParsers = React.useMemo(
    () => Object.fromEntries(codec.urlKeys.map((key: string) => [key, parseAsString])),
    [codec]
  );
  const [raw, setRaw] = useQueryStates(rawParsers);
  const state: UrlState<TShape> = React.useMemo(
    (): UrlState<TShape> => codec.parse(rawUrlParamsToSearch(raw)),
    [codec, raw]
  );
  const update = React.useCallback(
    (patch: Partial<UrlState<TShape>>, options?: UrlStateUpdateOptions): void => {
      void setRaw(
        (current: RawUrlParams): RawUrlParams => {
          const next: RawUrlParams = urlStateToRawParams(codec, {
            ...codec.parse(rawUrlParamsToSearch(current)),
            ...patch,
          });
          // Nothing to write.
          return isSameRawUrlParams(current, next) ? {} : next;
        },
        { history: options?.history ?? "push" }
      );
    },
    [codec, setRaw]
  );
  return [state, update];
}
```

### `lib/url-state/url-state-provider.tsx` (new)

```tsx
// ============================================
// lib/url-state/url-state-provider.tsx - the URL-state engine on Expo Router
// ============================================
// nuqs ships adapters for Next.js, React Router, Remix and TanStack Router, not Expo Router. This is
// that adapter, built on nuqs's custom-adapter API (`nuqs/adapters/custom`): every `useUrlState`
// reads and writes through it. The app mounts `UrlStateProvider` ONCE, in its root layout.
//
// Each hook speaks for the screen it runs in:
//   - reads `useLocalSearchParams()` — that screen's own params, so a screen kept mounted under the
//     next one (a stack) or in another tab never sees someone else's query;
//   - writes with that screen's `navigation.replaceParams`, in place (Expo Router has no shallow
//     history push: see use-url-state.ts). nuqs hands over the screen's whole next query, so the
//     route ends up carrying exactly it: a param the update dropped is gone (`setParams` would merge
//     and leave `?page=undefined` behind), and the route's path params (`[id]`) carry through, since
//     a screen's params are its path params and its query together.
//
// It also hands nuqs the screen's `pathname` and a synchronous snapshot of its params: without them
// nuqs falls back to the browser's `location`, which a phone does not have.

import { useLocalSearchParams, useNavigation, usePathname } from "expo-router";
import type { NavigationProp, ParamListBase } from "expo-router/react-navigation";
import {
  unstable_createAdapterProvider as createAdapterProvider,
  type unstable_AdapterInterface as AdapterInterface,
} from "nuqs/adapters/custom";
import * as React from "react";

import { toUrlSearchParams } from "./url-state";

/** A screen's route params: one value per key, or several for a repeated key. */
export type RouteParams = Readonly<Record<string, string | readonly string[]>>;

/** `search` as the route params that carry exactly it. */
export function routeParamsOf(search: URLSearchParams): RouteParams {
  return Object.fromEntries(
    [...new Set(search.keys())].map((key: string): [string, string | readonly string[]] => {
      const [only, ...more] = search.getAll(key);
      return [key, only !== undefined && more.length === 0 ? only : search.getAll(key)];
    })
  );
}

/** nuqs's view of one screen's route. */
function useExpoRouterAdapter(): AdapterInterface {
  // Any screen of any navigator: its params are whatever its route declares.
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const searchParams = React.useMemo((): URLSearchParams => toUrlSearchParams(params), [params]);
  // What the route carries right now, including a write the router has not rendered yet.
  const snapshot = React.useRef(searchParams);
  React.useLayoutEffect((): void => {
    snapshot.current = searchParams;
  }, [searchParams]);
  const updateUrl = React.useCallback(
    (search: URLSearchParams): void => {
      navigation.replaceParams(routeParamsOf(search));
      snapshot.current = new URLSearchParams(search);
    },
    [navigation]
  );
  const getSearchParamsSnapshot = React.useCallback((): URLSearchParams => new URLSearchParams(snapshot.current), []);
  return { searchParams, pathname, updateUrl, getSearchParamsSnapshot };
}

const ExpoRouterNuqsAdapter = createAdapterProvider(useExpoRouterAdapter);

export interface UrlStateProviderProps {
  readonly children: React.ReactNode;
}

/** The app-wide URL-state engine (nuqs on Expo Router). */
export function UrlStateProvider({ children }: UrlStateProviderProps): React.JSX.Element {
  return <ExpoRouterNuqsAdapter>{children}</ExpoRouterNuqsAdapter>;
}
```

### `lib/url-state/url-state-test-provider.tsx` (new)

nuqs's own `NuqsTestingAdapter` reads `location.pathname`, so it crashes under React Native's Jest environment; this is
a custom adapter like the app's:

```tsx
// ============================================
// lib/url-state/url-state-test-provider.tsx - the URL-state engine for component tests
// ============================================
// A component test renders a screen without a router. This runs the same engine (`useUrlState` on
// nuqs) against an in-memory query string instead: it starts from `searchParams`, keeps every write
// (so the screen re-reads what it wrote), and reports each write to `onUrlUpdate` so a test can
// assert the URL. Writes land on the next tick, as on a phone: assert them with `waitFor`.
//
// It is a nuqs custom adapter like the app's (url-state-provider.tsx), not nuqs's own testing
// adapter: that one reads the browser's `location` for the pathname, which React Native lacks. The
// Expo Router adapter itself is tested against a real in-memory router (url-state-provider.test.tsx).

import {
  renderQueryString,
  unstable_createAdapterProvider as createAdapterProvider,
  type unstable_AdapterInterface as AdapterInterface,
  type unstable_AdapterOptions as AdapterOptions,
} from "nuqs/adapters/custom";
import * as React from "react";

/** The path the in-memory URL lives at. */
const TEST_PATHNAME = "/";

/** Writes go out at once, not throttled: a test asserts them without waiting out a rate limit. */
const NO_RATE_LIMIT = 0;

/** One write to the in-memory URL. */
export interface UrlUpdateEvent {
  readonly searchParams: URLSearchParams;
  /** The whole query, with its `?` (`"?page=3"`), or `""` when it is empty. */
  readonly queryString: string;
  readonly options: Required<AdapterOptions>;
}

type MemoryUrl = Pick<AdapterInterface, "searchParams" | "updateUrl" | "getSearchParamsSnapshot">;

const MemoryUrlContext = React.createContext<MemoryUrl | null>(null);

function useMemoryUrlAdapter(): AdapterInterface {
  const memory = React.use(MemoryUrlContext);
  if (memory === null) {
    throw new Error("useUrlState under test needs a UrlStateTestProvider around it.");
  }
  return { ...memory, pathname: TEST_PATHNAME, rateLimitFactor: NO_RATE_LIMIT };
}

const MemoryNuqsAdapter = createAdapterProvider(useMemoryUrlAdapter);

export interface UrlStateTestProviderProps {
  /** The query string the screen opens with (`"?page=2"`); none by default. */
  readonly searchParams?: string;
  /** Called with every write. */
  readonly onUrlUpdate?: (event: UrlUpdateEvent) => void;
  readonly children: React.ReactNode;
}

/** `useUrlState` for tests, backed by an in-memory URL. */
export function UrlStateTestProvider({
  searchParams = "",
  onUrlUpdate,
  children,
}: UrlStateTestProviderProps): React.JSX.Element {
  const [search, setSearch] = React.useState((): URLSearchParams => new URLSearchParams(searchParams));
  const snapshot = React.useRef(search);
  const memory = React.useMemo(
    (): MemoryUrl => ({
      searchParams: search,
      updateUrl: (next: URLSearchParams, options: Required<AdapterOptions>): void => {
        snapshot.current = new URLSearchParams(next);
        setSearch(new URLSearchParams(next));
        onUrlUpdate?.({ searchParams: new URLSearchParams(next), queryString: renderQueryString(next), options });
      },
      getSearchParamsSnapshot: (): URLSearchParams => new URLSearchParams(snapshot.current),
    }),
    [onUrlUpdate, search]
  );
  return (
    <MemoryUrlContext value={memory}>
      <MemoryNuqsAdapter>{children}</MemoryNuqsAdapter>
    </MemoryUrlContext>
  );
}
```

### `app/_layout.tsx` (edit)

```diff
+import { UrlStateProvider } from "../lib/url-state/url-state-provider";
 …
     <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
-      <AppShell runtime={runtime} fontsReady={fontsReady} />
+      <UrlStateProvider>
+        <AppShell runtime={runtime} fontsReady={fontsReady} />
+      </UrlStateProvider>
     </KeyboardProvider>
```

(In the starter kit, wrap whatever the root layout renders inside `KeyboardProvider`.)

### `jest.config.js` (edit) and the install

nuqs ships ES modules only, with no CommonJS build to map to, so Jest has to compile it. The starter kit already has
the mechanism — add it to the list:

```diff
-const ES_MODULE_ONLY_PACKAGES = ["marked"];
+const ES_MODULE_ONLY_PACKAGES = ["marked", "nuqs"];
```

```bash
pnpm --filter @workspace/mobile add nuqs@2.10.2   # pinned: the custom-adapter API is still `unstable_`
```

### Usage

```ts
export const ORDERS_URL_STATE = defineUrlState({ page: pageUrlParam(), status: optionalUrlParam(OrderStatusSchema) });
const [{ page, status }, updateUrlState] = useUrlState(ORDERS_URL_STATE);
updateUrlState({ status: "locked", page: 1 });
router.push(ORDERS_URL_STATE.href("/orders", { page: 2, status: undefined }));
```

Tests (copy from this repo): `lib/url-state/__tests__/url-state.test.ts` (the codec),
`lib/url-state/__tests__/use-url-state.test.tsx` (the hook on the test engine) and
`lib/url-state/__tests__/url-state-provider.test.tsx` — the adapter against Expo Router's real in-memory router
(`renderRouter` from `expo-router/testing-library`): deep link, write, clearing a param, per-screen isolation with
`[id]` kept.

## 10. Team members on Home — paged list, details page, Home as a stack

Home gains a "Team members" card: a list with **server-side** pagination (Previous / "Page 1 of 3" / Next, 4 per page,
the page in the URL as `?page=`), each row opening a **details page** (`/team/[id]`: contact, address, company) that
pushes onto Home's own stack with a back button. Skeletons while loading, retry on failure, "not found" for an unknown
id, pull to refresh.

> **In the starter kit,** API calls go only through `@workspace/api-client` (rules/04). This repo reads the public
> JSONPlaceholder demo API with `fetch` + zod (`sample-users.ts`); port the screens, routing, URL state and query
> pattern, and point `useSampleUsersPage` / `useSampleUserDetails` at the real endpoints through the API client
> instead (or keep JSONPlaceholder only as a demo).

### Home becomes a stack: `app/(app)/(home)/` (new) + `features/navigation/app-tabs.ts` (edit)

Move `app/(app)/index.tsx` to `app/(app)/(home)/index.tsx` and add the stack layout — like Profile's and Settings':

```tsx
// Home: a stack inside the Home tab (rules/04, nested layouts) — Home, then a team member opened
// from its list.

import { Stack } from "expo-router";
import * as React from "react";

import { PUSH_TRANSITION } from "../../../lib/screen-transitions";

const SCREEN_OPTIONS = { headerShown: false, animation: PUSH_TRANSITION } satisfies React.ComponentProps<
  typeof Stack
>["screenOptions"];

/** Home is always the stack's first screen, even when a team member is opened directly: going back from it lands on Home. */
const HOME_STACK_SETTINGS = { anchor: "index" };

// Expo Router reads the stack's settings from this exact export name.
export { HOME_STACK_SETTINGS as unstable_settings };

export default function HomeLayout(): React.JSX.Element {
  return <Stack screenOptions={SCREEN_OPTIONS} />;
}
```

The Home tab's route name becomes the group:

```diff
-export type AppTabName = "index" | "analytics" | "search" | "profile" | "settings";
+export type AppTabName = "(home)" | "analytics" | "search" | "profile" | "settings";
 …
-  { name: "index", title: "Home", icon: HouseIcon, route: ROUTES.home },
+  { name: "(home)", title: "Home", icon: HouseIcon, route: ROUTES.home },
```

…and `TAB_SUBTITLES` in `app-screens.ts` is keyed `"(home)"` (section 3). The path stays `/`.

### Dynamic routes: `runtime/routes.ts` (edit)

A route with a parameter is pushed as `{ pathname, params }`, never navigated to as a bare path — so it stays out of
`ROUTES` (the drawer and tab preloading navigate to every `ROUTES` entry directly, and typed routes reject a bare
`/team/[id]`):

```ts
/**
 * Routes with a parameter in their path. They are pushed as `{ pathname, params }` (an href helper
 * beside the screen's feature), never navigated to as a bare path, so they stay out of `ROUTES`.
 */
export const DYNAMIC_ROUTES = {
  /** One team member, by their id: `router.push(teamMemberHref(id))` (features/sample-users). */
  teamMember: "/team/[id]",
} satisfies Record<string, `/${string}`>;

/** The paths DYNAMIC_ROUTES.teamMember resolves to ("/team/3"), for code that maps a path back to its screen. */
export const TEAM_MEMBER_PATH = /^\/team\/[^/]+$/;
```

After adding a route file, start Metro once (`pnpm start`) so Expo Router regenerates its typed routes
(`.expo/types/router.d.ts`) — until then `typecheck` rejects the new pathname.

### `app/(app)/(home)/index.tsx` (replace)

```tsx
// ============================================
// Home (§10.7) — the starter shell's placeholder dashboard
// ============================================
// Shows who is signed in, and the team members read from a public demo API (features/sample-users)
// through TanStack Query: a skeleton while the first load runs, Previous / Next through the pages
// (the page on screen stays while the next loads), the cached pages on every later visit, and pull to
// refresh. A team member opens their details (team/[id].tsx). Products replace this screen with their own.
//
// The page lives in the URL (`/?page=2`, lib/url-state), not in component state: a deep link opens
// the list on that page, and a page past the end (`?page=99`) settles on the last one.

import { useRouter } from "expo-router";
import * as React from "react";
import { View } from "react-native";

import { Avatar } from "@workspace/ui-native/components/avatar";
import { Card } from "@workspace/ui-native/components/card";
import { BodyText, MutedText, Subheading } from "@workspace/ui-native/components/text";
import { Screen } from "../../../components/screen";
import type { SampleUser } from "../../../features/sample-users/sample-users";
import { pageCountOf, SampleUsersCard } from "../../../features/sample-users/sample-users-card";
import { teamMemberHref } from "../../../features/sample-users/team-member-route";
import { TEAM_MEMBERS_URL_STATE } from "../../../features/sample-users/team-members-url-state";
import { SAMPLE_USERS_PAGE_SIZE, useSampleUsersPage } from "../../../features/sample-users/use-sample-users";
import { useSessionUser } from "../../../features/session/facade";
import { useUrlState } from "../../../lib/url-state/use-url-state";

export default function HomeScreen(): React.JSX.Element {
  const user = useSessionUser();
  const router = useRouter();
  const [{ page }, updateUrlState] = useUrlState(TEAM_MEMBERS_URL_STATE);
  const sampleUsers = useSampleUsersPage(page);
  const changePage = React.useCallback(
    (next: number): void => {
      updateUrlState({ page: next });
    },
    [updateUrlState]
  );
  // A link past the last page lands on the last page, once the list says how many there are.
  const lastPage =
    sampleUsers.data === undefined || sampleUsers.isPlaceholderData
      ? null
      : pageCountOf(sampleUsers.data.total, SAMPLE_USERS_PAGE_SIZE);
  React.useEffect((): void => {
    if (lastPage !== null && page > lastPage) {
      updateUrlState({ page: lastPage }, { history: "replace" });
    }
  }, [lastPage, page, updateUrlState]);
  const { refetch } = sampleUsers;
  // Moving to another page also refetches; only a refetch of the page on screen is a refresh.
  const refreshing = sampleUsers.isRefetching && !sampleUsers.isPlaceholderData;
  const refresh = React.useCallback((): void => {
    void refetch();
  }, [refetch]);
  const openTeamMember = React.useCallback(
    (member: SampleUser): void => {
      router.push(teamMemberHref(member.id));
    },
    [router]
  );

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {user === null ? null : (
        <Card>
          <View className="flex-row items-center gap-4">
            <Avatar name={user.fullName} imageUrl={null} />
            <View className="flex-1 gap-0.5">
              <Subheading>{user.fullName}</Subheading>
              <MutedText>{user.email}</MutedText>
            </View>
          </View>
        </Card>
      )}
      <Card title="This is the starter shell">
        <BodyText>
          Sign-in, profile, settings, security and devices are all here as screens. Build your product&apos;s screens on
          top of them.
        </BodyText>
        <MutedText>
          Apart from the team members below, everything runs on local sample data — no backend is needed.
        </MutedText>
      </Card>
      <SampleUsersCard
        status={sampleUsers.status}
        data={sampleUsers.data}
        page={page}
        pageSize={SAMPLE_USERS_PAGE_SIZE}
        onPageChange={changePage}
        changingPage={sampleUsers.isPlaceholderData}
        onSelect={openTeamMember}
        onRetry={refresh}
        retrying={refreshing}
      />
    </Screen>
  );
}
```

### `app/(app)/(home)/team/[id].tsx` (new)

```tsx
// ============================================
// Team member — one person from Home's team members list (features/sample-users)
// ============================================
// The id comes from the route and is parsed before anything is requested; an id that is not a
// positive whole number, or one the API does not know, shows "not found". The person is cached per
// id (TanStack Query), so opening them again shows them at once; pull to refresh refetches.

import { useLocalSearchParams } from "expo-router";
import * as React from "react";

import { Screen } from "../../../../components/screen";
import { SampleUserDetails, type SampleUserDetailsStatus } from "../../../../features/sample-users/sample-user-details";
import { isUserNotFound } from "../../../../features/sample-users/sample-users";
import { teamMemberIdOf } from "../../../../features/sample-users/team-member-route";
import { useSampleUserDetails } from "../../../../features/sample-users/use-sample-users";

export default function TeamMemberScreen(): React.JSX.Element {
  const params = useLocalSearchParams();
  const id = teamMemberIdOf(params);
  const details = useSampleUserDetails(id);
  const { refetch } = details;
  const refresh = React.useCallback((): void => {
    void refetch();
  }, [refetch]);
  const status: SampleUserDetailsStatus = id === null || isUserNotFound(details.error) ? "notFound" : details.status;

  return (
    <Screen refreshing={details.isRefetching} {...(id === null ? {} : { onRefresh: refresh })}>
      <SampleUserDetails status={status} user={details.data} onRetry={refresh} retrying={details.isRefetching} />
    </Screen>
  );
}
```

### `features/sample-users/` (new)

`team-member-route.ts` — the route's params are parsed before anything is requested:

```ts
// The team member screen's route: `/team/[id]`. Its id arrives from the URL (a deep link included),
// so it is parsed before anything is requested.

import { z } from "zod";

import { DYNAMIC_ROUTES } from "../../runtime/routes";

/** `[id]` of the route: a positive whole number, sent as text. */
export const TeamMemberRouteParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform((id: string): number => Number(id)),
});

/** The id a route's params name, or `null` when they name none (the screen then says "not found"). */
export function teamMemberIdOf(params: Readonly<Record<string, string | string[] | undefined>>): number | null {
  const parsed = TeamMemberRouteParamsSchema.safeParse(params);
  return parsed.success ? parsed.data.id : null;
}

/** Where a team member is opened: `router.push(teamMemberHref(user.id))`. */
export function teamMemberHref(id: number): {
  readonly pathname: typeof DYNAMIC_ROUTES.teamMember;
  readonly params: { readonly id: string };
} {
  return { pathname: DYNAMIC_ROUTES.teamMember, params: { id: String(id) } };
}
```

`team-members-url-state.ts` — the list's URL state (section 9):

```ts
// The team members list's URL state (lib/url-state): the page it shows. Declared once, so Home reads
// and writes it and a link can open the list on any page (`TEAM_MEMBERS_URL_STATE.href("/", { page: 2 })`).
// An absent or malformed `?page=` opens the first page.

import { defineUrlState, pageUrlParam } from "../../lib/url-state/url-state";

export const TEAM_MEMBERS_URL_STATE = defineUrlState({ page: pageUrlParam() });
```

`sample-users.ts` — the fetch + zod boundary (replace with the API client in the starter kit):

```ts
// The sample users the Home screen lists, read from JSONPlaceholder — a free, public, read-only demo
// API (https://jsonplaceholder.typicode.com). It is the app's only network source: the rest of the
// app runs on local sample data. Responses cross a trust boundary, so they are parsed with zod once,
// here (rules/28); everything past this file uses the parsed types.
//
// The address is the same in every environment (it is a public demo service, not this product's API),
// so it is a constant rather than Expo config.

import { z } from "zod";

export const SAMPLE_USERS_URL = "https://jsonplaceholder.typicode.com/users";

/** The header the API answers a paged request with: how many users there are in all. */
export const TOTAL_COUNT_HEADER = "X-Total-Count";

/** Statuses from this one up are the server's fault: worth retrying, unlike a missing user. */
const FIRST_SERVER_ERROR_STATUS = 500;

/** The fields the list shows; the API sends more (address, phone, website), which zod drops. */
export const sampleUserSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  username: z.string().min(1),
  email: z.email(),
  company: z.object({ name: z.string().min(1) }),
});

export type SampleUser = z.infer<typeof sampleUserSchema>;

/** One user in full, for the details screen. */
export const sampleUserDetailsSchema = sampleUserSchema.extend({
  phone: z.string().min(1),
  website: z.string().min(1),
  address: z.object({
    street: z.string().min(1),
    suite: z.string().min(1),
    city: z.string().min(1),
    zipcode: z.string().min(1),
  }),
  company: z.object({
    name: z.string().min(1),
    catchPhrase: z.string().min(1),
    bs: z.string().min(1),
  }),
});

export type SampleUserDetails = z.infer<typeof sampleUserDetailsSchema>;

const sampleUsersSchema = z.array(sampleUserSchema);

/** The total-count header: a whole number, sent as text. */
const totalCountSchema = z
  .string()
  .regex(/^\d+$/)
  .transform((count: string): number => Number(count));

/** One page of the list: 1-based `page`, `pageSize` users per page. */
export interface SampleUsersPageRequest {
  readonly page: number;
  readonly pageSize: number;
}

export interface SampleUsersPage {
  readonly users: readonly SampleUser[];
  /** How many users there are across every page. */
  readonly total: number;
}

/** The request was answered with an error status (the body is not read). */
export class SampleUsersRequestError extends Error {
  public readonly status: number;

  public constructor(status: number) {
    super(`The users could not be loaded (HTTP ${String(status)}).`);
    this.name = "SampleUsersRequestError";
    this.status = status;
  }

  /** A 4xx: asking again gets the same answer. */
  public get isClientError(): boolean {
    return this.status < FIRST_SERVER_ERROR_STATUS;
  }
}

/** The API answered this request with "no such user". */
export function isUserNotFound(error: Error | null): boolean {
  return error instanceof SampleUsersRequestError && error.isClientError;
}

async function getJson(url: string, signal: AbortSignal): Promise<Response> {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new SampleUsersRequestError(response.status);
  }
  return response;
}

/**
 * Fetches and parses one page of users. Rejects with `SampleUsersRequestError` on an error status,
 * with zod's error when the body or the total-count header is not the expected shape, and with the
 * fetch error when the network fails or `signal` aborts (TanStack Query aborts a cancelled query).
 */
export async function fetchSampleUsersPage(
  { page, pageSize }: SampleUsersPageRequest,
  signal: AbortSignal
): Promise<SampleUsersPage> {
  const response = await getJson(`${SAMPLE_USERS_URL}?_page=${String(page)}&_limit=${String(pageSize)}`, signal);
  return {
    users: sampleUsersSchema.parse(await response.json()),
    total: totalCountSchema.parse(response.headers.get(TOTAL_COUNT_HEADER)),
  };
}

/** Fetches and parses one user in full; rejects like `fetchSampleUsersPage` (a 404 for an unknown id). */
export async function fetchSampleUserDetails(id: number, signal: AbortSignal): Promise<SampleUserDetails> {
  const response = await getJson(`${SAMPLE_USERS_URL}/${String(id)}`, signal);
  return sampleUserDetailsSchema.parse(await response.json());
}
```

`use-sample-users.ts` — key factory, `keepPreviousData` while paging, no retry on a 404:

```ts
// The sample users as server state: TanStack Query owns them (rules/06). Each page and each user is
// cached under its own key, so going back to a page or a person shows it at once and refetches in the
// background only once stale (the client's defaults, lib/query-client.ts). While another page loads,
// the previous one stays on screen.

import { keepPreviousData, skipToken, useQuery, type UseQueryResult } from "@tanstack/react-query";

import { MAX_QUERY_RETRIES } from "../../lib/query-client";
import {
  fetchSampleUserDetails,
  fetchSampleUsersPage,
  isUserNotFound,
  type SampleUserDetails,
  type SampleUsersPage,
  type SampleUsersPageRequest,
} from "./sample-users";

/** Users per page of the Home screen's list (JSONPlaceholder has 10). */
export const SAMPLE_USERS_PAGE_SIZE = 4;

/** The feature's query keys, built in one place so every input is part of its key (rules/06). */
export const sampleUserKeys = {
  all: (): readonly ["sample-users"] => ["sample-users"],
  lists: (): readonly ["sample-users", "list"] => ["sample-users", "list"],
  list: (request: SampleUsersPageRequest): readonly ["sample-users", "list", SampleUsersPageRequest] => [
    "sample-users",
    "list",
    request,
  ],
  details: (): readonly ["sample-users", "detail"] => ["sample-users", "detail"],
  detail: (id: number | null): readonly ["sample-users", "detail", number | null] => ["sample-users", "detail", id],
};

/** Retries a failure that might pass next time; never a "no such user", which would only answer the same. */
export function retryUnlessNotFound(failureCount: number, error: Error): boolean {
  return !isUserNotFound(error) && failureCount < MAX_QUERY_RETRIES;
}

/** One page of the list (1-based). */
export function useSampleUsersPage(page: number): UseQueryResult<SampleUsersPage> {
  const request: SampleUsersPageRequest = { page, pageSize: SAMPLE_USERS_PAGE_SIZE };
  return useQuery({
    queryKey: sampleUserKeys.list(request),
    queryFn: ({ signal }): Promise<SampleUsersPage> => fetchSampleUsersPage(request, signal),
    placeholderData: keepPreviousData,
    retry: retryUnlessNotFound,
  });
}

/** One user in full; `null` (a route without a valid id) requests nothing. */
export function useSampleUserDetails(id: number | null): UseQueryResult<SampleUserDetails> {
  return useQuery({
    queryKey: sampleUserKeys.detail(id),
    queryFn: id === null ? skipToken : ({ signal }): Promise<SampleUserDetails> => fetchSampleUserDetails(id, signal),
    retry: retryUnlessNotFound,
  });
}
```

`labels.ts`:

```ts
// Copy of the Home screen's team-members card and the team member screen (features/sample-users).

export const SAMPLE_USERS_COPY = {
  title: "Team members",
  description: "Loaded from JSONPlaceholder, a public demo API.",
  loading: "Loading team members",
  empty: "No team members yet.",
  error: "The team members couldn't be loaded. Check your connection and try again.",
  retry: "Try again",
  pagination: "Team members pages",
  openDetailsHint: "Opens their details",
} satisfies Record<string, string>;

/** The team member screen's header. */
export const SAMPLE_USER_DETAILS_TITLE = "Team member";
export const SAMPLE_USER_DETAILS_SUBTITLE = "Contact and company details";

export const SAMPLE_USER_DETAILS_COPY = {
  loading: "Loading team member",
  error: "This team member couldn't be loaded. Check your connection and try again.",
  retry: "Try again",
  notFoundTitle: "Team member not found",
  notFound: "They may have been removed, or the link is wrong.",
  contact: "Contact",
  email: "Email",
  phone: "Phone",
  website: "Website",
  address: "Address",
  street: "Street",
  city: "City",
  zipcode: "Postcode",
  company: "Company",
  companyName: "Name",
  catchPhrase: "Catchphrase",
  business: "Business",
} satisfies Record<string, string>;
```

`sample-users-card.tsx` — the list, its skeleton and the pagination (the kit's `Pagination`):

```tsx
// The Home screen's "Team members" card. Presentational: the screen runs the query
// (use-sample-users.ts) and passes its state in. While the first load runs, a skeleton of the rows
// holds their place, so the card does not jump when the list arrives; a failed load offers a retry.
// Under the list, Previous / Next move through the pages; a row opens that person's details.

import ChevronRightIcon from "lucide-react-native/icons/chevron-right";
import * as React from "react";
import { Pressable, View } from "react-native";

import { Avatar } from "@workspace/ui-native/components/avatar";
import { Card } from "@workspace/ui-native/components/card";
import { EmptyState, ErrorState } from "@workspace/ui-native/components/empty";
import { Icon } from "@workspace/ui-native/components/icon";
import { Pagination } from "@workspace/ui-native/components/pagination";
import { Separator } from "@workspace/ui-native/components/separator";
import { Skeleton, SkeletonGroup, SkeletonText } from "@workspace/ui-native/components/skeleton";
import { BodyText, MutedText } from "@workspace/ui-native/components/text";

import { SAMPLE_USERS_COPY } from "./labels";
import type { SampleUser, SampleUsersPage } from "./sample-users";

const FIRST_PAGE = 1;
const FIRST_POSITION = 0;

export type SampleUsersStatus = "pending" | "error" | "success";

export interface SampleUsersCardProps {
  readonly status: SampleUsersStatus;
  /** The page on screen; read only when `status` is `success`. */
  readonly data: SampleUsersPage | undefined;
  /** The page asked for (1-based). */
  readonly page: number;
  readonly pageSize: number;
  readonly onPageChange: (page: number) => void;
  /** Another page is loading while the previous one stays on screen. */
  readonly changingPage: boolean;
  readonly onSelect: (user: SampleUser) => void;
  readonly onRetry: () => void;
  /** A retry is in flight. */
  readonly retrying: boolean;
}

/** How many pages `total` users fill, never fewer than one. */
export function pageCountOf(total: number, pageSize: number): number {
  return Math.max(FIRST_PAGE, Math.ceil(total / pageSize));
}

export function SampleUsersCard(props: SampleUsersCardProps): React.JSX.Element {
  return (
    <Card title={SAMPLE_USERS_COPY.title} description={SAMPLE_USERS_COPY.description} testID="sample-users">
      <SampleUsersBody {...props} />
    </Card>
  );
}

function SampleUsersBody({
  status,
  data,
  page,
  pageSize,
  onPageChange,
  changingPage,
  onSelect,
  onRetry,
  retrying,
}: SampleUsersCardProps): React.JSX.Element {
  if (status === "pending") {
    return <SampleUsersSkeleton rows={pageSize} />;
  }
  if (status === "error") {
    return (
      <ErrorState
        message={SAMPLE_USERS_COPY.error}
        retryLabel={SAMPLE_USERS_COPY.retry}
        onRetry={onRetry}
        retrying={retrying}
        testID="sample-users-error"
      />
    );
  }
  if (data === undefined || data.users.length === 0) {
    return <EmptyState message={SAMPLE_USERS_COPY.empty} testID="sample-users-empty" />;
  }
  const pageCount = pageCountOf(data.total, pageSize);
  return (
    <View className="gap-3">
      <View testID="sample-users-list">
        {data.users.map((user, position): React.JSX.Element => (
          <React.Fragment key={user.id}>
            {position === FIRST_POSITION ? null : <Separator />}
            <SampleUserRow user={user} onSelect={onSelect} />
          </React.Fragment>
        ))}
      </View>
      {pageCount > FIRST_PAGE ? (
        <Pagination
          page={page}
          pageCount={pageCount}
          onChange={onPageChange}
          loading={changingPage}
          size="sm"
          accessibilityLabel={SAMPLE_USERS_COPY.pagination}
          testID="sample-users-pagination"
        />
      ) : null}
    </View>
  );
}

interface SampleUserRowProps {
  readonly user: SampleUser;
  readonly onSelect: (user: SampleUser) => void;
}

function SampleUserRow({ user, onSelect }: SampleUserRowProps): React.JSX.Element {
  const select = React.useCallback((): void => {
    onSelect(user);
  }, [onSelect, user]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${user.name}, ${user.email}`}
      accessibilityHint={SAMPLE_USERS_COPY.openDetailsHint}
      onPress={select}
      className="flex-row items-center gap-3 py-3 active:opacity-70"
      testID={`sample-user-${String(user.id)}`}>
      <Avatar name={user.name} imageUrl={null} size="md" />
      <View className="flex-1 gap-0.5">
        <BodyText numberOfLines={1}>{user.name}</BodyText>
        <MutedText numberOfLines={1}>
          {user.email} · {user.company.name}
        </MutedText>
      </View>
      <Icon icon={ChevronRightIcon} size="md" colorClassName="accent-muted-foreground" />
    </Pressable>
  );
}

interface SampleUsersSkeletonProps {
  /** As many placeholder rows as a page holds. */
  readonly rows: number;
}

/** The rows' shape — avatar, name, one muted line — so the list drops into the same space. */
function SampleUsersSkeleton({ rows }: SampleUsersSkeletonProps): React.JSX.Element {
  const keys = React.useMemo(
    (): readonly string[] => Array.from({ length: rows }, (_unused, row): string => `row-${String(row)}`),
    [rows]
  );
  return (
    <SkeletonGroup accessibilityLabel={SAMPLE_USERS_COPY.loading} testID="sample-users-skeleton">
      {keys.map((key): React.JSX.Element => (
        <View key={key} className="flex-row items-center gap-3 py-3">
          <Skeleton className="size-8 rounded-full" />
          <View className="flex-1 gap-0.5">
            <SkeletonText size="base" widthClassName="w-2/5" />
            <SkeletonText size="sm" widthClassName="w-4/5" />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}
```

`sample-user-details.tsx` — the details page's body:

```tsx
// The team member screen's body: who they are, how to reach them, where they are and where they work.
// Presentational: the route reads the id and runs the query (use-sample-users.ts), then passes its
// state in. A skeleton of the cards holds their place while the person loads; an unknown id says so
// instead of offering a retry that would only fail again.

import UserXIcon from "lucide-react-native/icons/user-x";
import * as React from "react";
import { View } from "react-native";

import { Avatar } from "@workspace/ui-native/components/avatar";
import { Card } from "@workspace/ui-native/components/card";
import { DetailList, type DetailItem } from "@workspace/ui-native/components/detail-list";
import { EmptyState, ErrorState } from "@workspace/ui-native/components/empty";
import { Skeleton, SkeletonGroup, SkeletonText } from "@workspace/ui-native/components/skeleton";
import { MutedText, Subheading } from "@workspace/ui-native/components/text";

import { SAMPLE_USER_DETAILS_COPY } from "./labels";
import type { SampleUserDetails as SampleUserDetailsData } from "./sample-users";

export type SampleUserDetailsStatus = "pending" | "error" | "notFound" | "success";

export interface SampleUserDetailsProps {
  readonly status: SampleUserDetailsStatus;
  /** The person; read only when `status` is `success`. */
  readonly user: SampleUserDetailsData | undefined;
  readonly onRetry: () => void;
  /** A retry is in flight. */
  readonly retrying: boolean;
}

/** One card per subject, with its details as label → value rows. */
interface DetailSection {
  readonly title: string;
  readonly items: readonly DetailItem[];
}

function sectionsOf(user: SampleUserDetailsData): readonly DetailSection[] {
  const copy = SAMPLE_USER_DETAILS_COPY;
  return [
    {
      title: copy.contact,
      items: [
        { label: copy.email, value: user.email },
        { label: copy.phone, value: user.phone },
        { label: copy.website, value: user.website },
      ],
    },
    {
      title: copy.address,
      items: [
        { label: copy.street, value: `${user.address.street}, ${user.address.suite}` },
        { label: copy.city, value: user.address.city },
        { label: copy.zipcode, value: user.address.zipcode },
      ],
    },
    {
      title: copy.company,
      items: [
        { label: copy.companyName, value: user.company.name },
        { label: copy.catchPhrase, value: user.company.catchPhrase },
        { label: copy.business, value: user.company.bs },
      ],
    },
  ];
}

export function SampleUserDetails({ status, user, onRetry, retrying }: SampleUserDetailsProps): React.JSX.Element {
  if (status === "pending") {
    return <SampleUserDetailsSkeleton />;
  }
  if (status === "notFound") {
    return (
      <EmptyState
        icon={UserXIcon}
        title={SAMPLE_USER_DETAILS_COPY.notFoundTitle}
        message={SAMPLE_USER_DETAILS_COPY.notFound}
        testID="sample-user-not-found"
      />
    );
  }
  if (status === "error" || user === undefined) {
    return (
      <ErrorState
        message={SAMPLE_USER_DETAILS_COPY.error}
        retryLabel={SAMPLE_USER_DETAILS_COPY.retry}
        onRetry={onRetry}
        retrying={retrying}
        testID="sample-user-error"
      />
    );
  }
  return (
    <View className="gap-5" testID="sample-user-details">
      <Card>
        <View className="flex-row items-center gap-4">
          <Avatar name={user.name} imageUrl={null} />
          <View className="flex-1 gap-0.5">
            <Subheading numberOfLines={1}>{user.name}</Subheading>
            <MutedText numberOfLines={1}>@{user.username}</MutedText>
          </View>
        </View>
      </Card>
      {sectionsOf(user).map((section): React.JSX.Element => (
        <Card key={section.title} title={section.title}>
          <DetailList items={section.items} variant="stacked" />
        </Card>
      ))}
    </View>
  );
}

/** Placeholder rows per detail card: each card lists three details. */
const SKELETON_SECTION_KEYS = ["contact", "address", "company"];
const SKELETON_ROW_KEYS = ["first", "second", "third"];

/** The cards' shape — the person, then three cards of label → value rows. */
function SampleUserDetailsSkeleton(): React.JSX.Element {
  return (
    <SkeletonGroup
      accessibilityLabel={SAMPLE_USER_DETAILS_COPY.loading}
      testID="sample-user-skeleton"
      className="gap-5">
      <View className="flex-row items-center gap-4 rounded-xl border border-border p-4">
        <Skeleton className="size-14 rounded-full" />
        <View className="flex-1 gap-1">
          <SkeletonText size="lg" widthClassName="w-1/2" />
          <SkeletonText size="sm" widthClassName="w-1/3" />
        </View>
      </View>
      {SKELETON_SECTION_KEYS.map((section): React.JSX.Element => (
        <View key={section} className="gap-3 rounded-xl border border-border p-4">
          <SkeletonText size="lg" widthClassName="w-1/3" />
          {SKELETON_ROW_KEYS.map((row): React.JSX.Element => (
            <View key={row} className="gap-0.5">
              <SkeletonText size="sm" widthClassName="w-1/4" />
              <SkeletonText size="base" widthClassName="w-3/4" />
            </View>
          ))}
        </View>
      ))}
    </SkeletonGroup>
  );
}
```

`query-client.ts` exports its retry count so the hooks' retry rule reuses it:

```diff
-const MAX_QUERY_RETRIES = 2;
+export const MAX_QUERY_RETRIES = 2;
```

Tests (copy from this repo, `src/features/sample-users/__tests__/`): `sample-users.test.ts`,
`use-sample-users.test.tsx`, `sample-users-card.test.tsx`, `sample-user-details.test.tsx`,
`team-member-route.test.ts`, `team-members-url-state.test.ts`, the shared fixtures in `sample-users-responses.ts`, and
`src/features/navigation/__tests__/app-screens.test.ts` (headings, tab root, title drift for `/team/3`).

## 11. Dependencies

```bash
pnpm --filter @workspace/mobile add nuqs@2.10.2
cd apps/mobile && pnpm exec expo install --fix   # react-native 0.88.0 → 0.88.1 (Expo 58's expected version)
```

pnpm's `minimumReleaseAge` (one day) refuses a release younger than that — wait, or approve it interactively; don't
switch the check off.

## Pitfalls

- **Don't enable `experiments.noxcturnalTransformWorker`** (Expo 58's experimental native transform worker). It
  miscompiles `new` on an inline-required class into `new require("./X").X()`, which drops the module from the bundle:
  at runtime `Requiring unknown module "./LoaderClient"` (expo-router) and `"./AssetSourceResolver"` (React Native),
  and the app does not start. Leave it off and re-test before ever enabling it.
- **Keep generated files out of the formatter.** Running `oxfmt` over `src/` reformats the generated token stylesheet
  and the token staleness test then fails. Add the generated files (`mobile.css` / `launch-colors.json` in the starter
  kit's tokens package) to `.oxfmtrc.json` `ignorePatterns`.
- **The starter kit's `.gitignore` hides the PDF engine.** Its bare `ios` / `android` lines ignore those folders
  everywhere, including `apps/mobile/modules/pdf-renderer/ios` and `/android`: the repository holds only
  `expo-module.config.json`, so a development build has no PDF renderer (Expo Go is unaffected — it falls back to
  "open in another app"). Anchor them to the root — `/ios`, `/android` — and commit the module's Swift and Kotlin
  sources.
- **Reanimated's scroll event type** is exported as `ScrollEvent`; `ReanimatedScrollEvent` is internal.
- **Uniwind on Reanimated's scroll view:** `className` / `contentContainerClassName` only reach it through
  `withUniwind(Animated.ScrollView)` — a bare `Animated.ScrollView` silently drops the classes.
- **The subtitle must not ride with the content.** Translating the whole header with the scroll (and the controls row
  back down) makes the subtitle move finger for finger with the cards — it reads as part of the page. Move only the
  background; clip the subtitle at the rising edge and hold its text in place.
- **Don't rush the fade.** Fading the subtitle out over the first ~40 % of the collapse (so it is gone before the edge
  reaches it) on a straight line pops. Clipping removes that constraint: fade over the whole collapse on an ease.
- **Expo Router `setParams` merges.** Setting a param to `undefined` leaves `?page=undefined` in the route; use
  `replaceParams` with the complete param set.
- **nuqs needs `pathname` and `getSearchParamsSnapshot` from the adapter** — otherwise it reads `location`, which React
  Native lacks. nuqs's `NuqsTestingAdapter` has the same problem; use the custom test provider (section 9).
- **`renderHook`'s `rerender` can leave a TanStack Query hook's result stale** after a key change (the cache has the
  new page, the result does not). Drive the change through component state — a small harness with a button — as a
  screen does.
- **A mocked `fetch` must return a fresh `Response` per call** (`mockImplementation`, not `mockResolvedValue`): a body
  can be read once, and a retried or second request otherwise hangs.
- **No numeric indices** (rules/27): match dynamic headings with named fields (`{ path, heading }`), not tuples read
  with `[1]`.
- **Expo Go must match the SDK.** An older Expo Go shows a blue "Something went wrong" screen ("This project requires a
  newer version of Expo Go") before any JavaScript runs — update Expo Go (58.0.5+ for SDK 58).

## Test checklist (on a device)

1. **Top of a page:** menu, centred title + subtitle, bell; the header's colour runs up behind the status bar; the
   status bar icons are dark on the light theme, light on dark / Nord.
2. **Scroll down slowly:** the header's background closes up from its bottom edge, finger for finger, with the
   content's curved top attached to it; the subtitle stays where it is, barely changes over the first few points, then
   fades and is tucked under the rising edge; menu, title and bell never move.
3. **Scroll back to the top:** the subtitle returns along the same path.
4. **Switch tabs** with one page scrolled and another at its top: the header eases to each page's own state; the
   title slides toward the tab's side.
5. **Pull to refresh** (a screen with `onRefresh`): the header stays expanded.
6. **Content sheet:** the curve starts right under the header and scrolls up under it.
7. **Android drawer:** panel, scrim and blur reach the very top and bottom edges — no strips around the status bar or
   the gesture bar.
8. **First switch to each tab** (fresh launch, wait a second): smooth, including Analytics.
9. **Reduce Motion on:** the title and subtitle swap without sliding; the header still follows the scroll.
10. **Bell:** the toast drops in right under the menu / title / bell row — at the top of a page and when scrolled.
11. **Sign-in screen (light theme):** the status bar's time and icons are white on the dark panel; after signing in,
    Home's are dark again.
12. **Team members:** a skeleton, then 4 people and "Page 1 of 3"; Next / Previous page (the page on screen stays
    while the next loads); a row opens its details with a back button; Back returns to the same page.
13. **Deep links:** `exp://<host>:8081/--/?page=3` opens page 3; `?page=99` settles on the last page;
    `/--/team/abc` shows "Team member not found".
