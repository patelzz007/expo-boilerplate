// ============================================
// root-route.ts — the route group the app shows (the root guard's input)
// ============================================
// The session decides the group — except that a signed-out device that has never been through
// onboarding sees onboarding first (ADR 041), and nothing shows until the preferences are restored.

import type { SessionRoute } from "../features/session/selectors";

/** `config-error` is chosen by the root layout before the session exists (an invalid environment, src/lib/env.ts). */
export type AppRootRoute = "starting" | "config-error" | "onboarding" | SessionRoute;

export interface RootRouteInputs {
  /** The stored preferences (theme, onboarding) have been read. */
  readonly preferencesRestored: boolean;
  /** The group the session allows. */
  readonly sessionRoute: SessionRoute;
  readonly onboardingCompleted: boolean;
}

export function resolveRootRoute({
  preferencesRestored,
  sessionRoute,
  onboardingCompleted,
}: RootRouteInputs): AppRootRoute {
  if (!preferencesRestored) {
    return "starting";
  }
  return sessionRoute === "auth" && !onboardingCompleted ? "onboarding" : sessionRoute;
}
