# Mobile shell changes — porting guide

Six changes made to this Expo app's shell, written so they can be applied as they are to `apps/mobile` in the
turborepo starter kit (`nestjs-nextjs-turborepo-starter-kit`). Every path below is the starter kit's; imports use its
packages (`@workspace/ui-native/...`, `@workspace/tokens`) where this repo uses `@/ui/...` and `@/tokens`.

| # | Change | Files (in `apps/mobile/src/`) | Kind |
|---|---|---|---|
| 1 | Collapsing page header — scroll-linked, pinned menu / title / notifications | `lib/page-header-scroll.tsx` | **new** |
| 2 | Header layout — page-coloured, title + subtitle centred between menu and bell | `components/page-header.tsx` | replace |
| 3 | Wiring — the shell owns the scroll values, the app header reads them, a subtitle per screen | `features/app-shell/app-shell.tsx`, `features/app-shell/app-header.tsx`, `features/navigation/app-screens.ts` | replace |
| 4 | Curved content sheet under the header (the auth pages' curve) | `components/screen.tsx` | edit |
| 5 | Android edge-to-edge fix (strips above / below the app in Expo Go) | `app/_layout.tsx` | edit |
| 6 | Smooth first switch to each tab (preloading) | `features/navigation/use-preloaded-tabs.ts`, `features/navigation/app-tab-bar.tsx` | **new** + edit |

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
             band:      translateY = -progress × collapseDistance
             pinned row translateY = +progress × collapseDistance   (stays put)
             subtitle   opacity 1 → 0 over progress 0 → 0.6
             reports:   onHeightChange (whole header), onCollapseDistanceChange (subtitle line)
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
  return useDerivedValue(
    (): number =>
      clamp(scroll.scrollY.get() / Math.max(scroll.collapseDistance.get(), MIN_COLLAPSE_DISTANCE), EXPANDED, COLLAPSED),
    [scroll]
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
// - the subtitle line — centred under the title, between the two buttons. As the page scrolls
//   (`progress` 0 → 1, src/lib/page-header-scroll.tsx) the header shrinks with the content and the
//   subtitle fades out, leaving one slim bar that still shows the menu, the title and notifications.
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

const HIDDEN = 0;
const VISIBLE = 1;
const AT_REST = 0;
const EXPANDED = 0;
/** The subtitle is gone by the time the header is this far collapsed. */
const SUBTITLE_FADE_END = 0.6;

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
  /** The status bar's height: the header's colour runs up behind it. */
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

  // The header moves up with the content; the pinned row moves down by as much, so it stays put.
  const bandStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -progress.get() * collapseDistance.get() }],
  }));
  const pinnedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.get() * collapseDistance.get() }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [EXPANDED, SUBTITLE_FADE_END], [VISIBLE, HIDDEN], Extrapolation.CLAMP),
  }));
  const animates = slots.drift !== AT_REST;

  return (
    <StyledAnimatedView
      pointerEvents="box-none"
      onLayout={reportHeight}
      className="absolute inset-x-0 top-0 bg-background"
      style={[topInsetStyle, bandStyle]}
      testID={testID}>
      <StyledAnimatedView pointerEvents="box-none" className="z-10 bg-background px-3" style={pinnedStyle}>
        <View pointerEvents="box-none" className="h-14 flex-row items-center gap-2">
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
      </StyledAnimatedView>
      {/* Indented by the buttons' width, so the subtitle sits between them, under the title. */}
      <View pointerEvents="none" onLayout={reportCollapseDistance} className="px-16 pb-4">
        <StyledAnimatedView style={subtitleStyle}>
          <StyledAnimatedView key={slots.current.key} {...(animates ? { entering: CONTROL_IN } : {})}>
            <Text numberOfLines={1} className="text-center font-sans text-sm text-muted-foreground">
              {slots.current.subtitle}
            </Text>
          </StyledAnimatedView>
        </StyledAnimatedView>
      </View>
    </StyledAnimatedView>
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

Tuning lives in the constants at the top: `SUBTITLE_FADE_END` (how early the subtitle is gone) and the classes on the
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

import { PAGE_HEADER_ESTIMATED_HEIGHT } from "../../components/page-header";
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
                <ToastHost top={headerBottom} />
              </View>
            </PageHeaderScrollProvider>
          </PageHeaderClearanceProvider>
        </AppDrawer>
      </ToastStoreProvider>
    </AppDrawerStoreProvider>
  );
}
```

> The starter kit's shell also renders the app-status pills (`trailing`) and passes the header's row height
> constants (`PAGE_HEADER_ROW_HEIGHT`, `PAGE_HEADER_FADE_HEIGHT`). Both are replaced here by the measured height.

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

import { ROUTES, type AppRoute } from "../../runtime/routes";
import { APP_TABS, type AppTab } from "./app-tabs";
import { SCREEN_TITLES } from "./screen-titles";

export interface ScreenHeading {
  readonly title: string;
  readonly subtitle: string;
}

/** Each tab's subtitle; the tab's title comes from APP_TABS. */
const TAB_SUBTITLES: Readonly<Record<AppTab["name"], string>> = {
  index: "Your account at a glance",
  analytics: "Your activity over time",
  search: "Find anything in the app",
  profile: "Your personal details",
  settings: "Manage your preferences and account",
};

const SUB_SCREEN_HEADINGS: readonly (readonly [AppRoute, ScreenHeading])[] = [
  [ROUTES.security, { title: SCREEN_TITLES.security, subtitle: "Your password and sign-in" }],
  [ROUTES.devices, { title: SCREEN_TITLES.devices, subtitle: "Where your account is signed in" }],
  [ROUTES.appearance, { title: SCREEN_TITLES.appearance, subtitle: "Choose how the app looks" }],
  [ROUTES.components, { title: SCREEN_TITLES.components, subtitle: "The UI kit, live" }],
];

const HEADINGS: ReadonlyMap<string, ScreenHeading> = new Map<string, ScreenHeading>([
  ...APP_TABS.map((tab: AppTab): [string, ScreenHeading] => [
    tab.route,
    { title: tab.title, subtitle: TAB_SUBTITLES[tab.name] },
  ]),
  ...SUB_SCREEN_HEADINGS,
]);

const NO_HEADING: ScreenHeading = { title: "", subtitle: "" };

/** The heading of the screen at `pathname`; empty for a path the app does not have. */
export function screenHeadingOf(pathname: string): ScreenHeading {
  return HEADINGS.get(pathname) ?? NO_HEADING;
}
```

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

## Test checklist (on a device)

1. **Top of a page:** menu, centred title + subtitle, bell; the header's colour runs up behind the status bar; the
   status bar icons are dark on the light theme, light on dark / Nord.
2. **Scroll down slowly:** the header shrinks with the content, finger for finger; the subtitle is gone by ~60 % of
   its height; menu, title and bell never move.
3. **Scroll back to the top:** the subtitle returns along the same path.
4. **Switch tabs** with one page scrolled and another at its top: the header eases to each page's own state; the
   title slides toward the tab's side.
5. **Pull to refresh** (a screen with `onRefresh`): the header stays expanded.
6. **Content sheet:** the curve starts right under the header and scrolls up under it.
7. **Android drawer:** panel, scrim and blur reach the very top and bottom edges — no strips around the status bar or
   the gesture bar.
8. **First switch to each tab** (fresh launch, wait a second): smooth, including Analytics.
9. **Reduce Motion on:** the title and subtitle swap without sliding; the header still follows the scroll.
