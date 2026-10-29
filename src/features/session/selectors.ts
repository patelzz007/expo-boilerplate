import type { SessionState, SessionUser, SignedOutReason } from "./state";

/** The route groups the session allows (before onboarding is considered). */
export type SessionRoute = "auth" | "app";

export function selectSessionRoute(state: SessionState): SessionRoute {
  return state.status === "signedIn" ? "app" : "auth";
}

export function selectSessionUser(state: SessionState): SessionUser | null {
  return state.status === "signedIn" ? state.user : null;
}

/** Why the device is signed out, for the sign-in screen's notice; `null` while signed in. */
export function selectSignedOutReason(state: SessionState): SignedOutReason | null {
  return state.status === "signedOut" ? state.reason : null;
}
