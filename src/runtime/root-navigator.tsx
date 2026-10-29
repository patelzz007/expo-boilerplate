// ============================================
// root-navigator.tsx - the root guard (docs/technical/mobile/mobile-app.md §9.6)
// ============================================
// Exactly ONE route group is reachable at a time; Expo Router's protected screens redirect away from
// every other one. Screens never decide where to go after signing in or out — they report what
// happened to the session store, and this guard moves the app.
//
// | State       | Routes allowed                                           |
// | ConfigError | config-error only                                        |
// | SignedOut   | onboarding only, until it is done (ADR 041); then (auth) |
// | SignedIn    | (app) only                                               |

import { Stack } from "expo-router";
import * as React from "react";

import { ROOT_TRANSITION } from "../lib/screen-transitions";
import type { AppRootRoute } from "./root-route";
import { ROUTES, type AppRoute } from "./routes";

export interface RootStackProps {
  readonly route: Exclude<AppRootRoute, "starting">;
}

const SCREEN_OPTIONS = { headerShown: false, animation: ROOT_TRANSITION } satisfies React.ComponentProps<
  typeof Stack
>["screenOptions"];

/**
 * The screen each state opens on. A guard that turns a URL away sends it here, explicitly: Expo
 * Router's own fallback is the first allowed group's path, and for the pathless (auth) group that is
 * `/` — a URL it has no screen for.
 */
const ROOT_ROUTE_ENTRY = {
  "config-error": ROUTES.configError,
  onboarding: ROUTES.onboarding,
  auth: ROUTES.signIn,
  app: ROUTES.home,
} satisfies Record<RootStackProps["route"], AppRoute>;

/** The navigator with every group guarded by the current root route. */
export function RootStack({ route }: RootStackProps): React.JSX.Element {
  const entry = ROOT_ROUTE_ENTRY[route];
  return (
    <Stack screenOptions={SCREEN_OPTIONS}>
      <Stack.Protected redirectTo={entry} guard={route === "config-error"}>
        <Stack.Screen name="config-error" />
      </Stack.Protected>
      <Stack.Protected redirectTo={entry} guard={route === "onboarding"}>
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected redirectTo={entry} guard={route === "auth"}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected redirectTo={entry} guard={route === "app"}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
