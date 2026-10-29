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
