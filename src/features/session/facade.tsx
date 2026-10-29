// The session feature's facade: the only module screens import (ADR 023). The session is a local demo
// session — signing in stores who is signed in, in memory; there is no API and no token.

import * as React from "react";

import { createFeatureStoreContext } from "../../lib/state/feature-store-context";
import { sessionActions, type SessionAction } from "./actions";
import { selectSessionRoute, selectSessionUser, selectSignedOutReason, type SessionRoute } from "./selectors";
import type { SessionState, SessionUser, SignedOutReason } from "./state";

const sessionContext = createFeatureStoreContext<SessionState, SessionAction>("Session");

/** Mounted once by the root (src/runtime/app-shell.tsx) with the runtime's session store. */
export const SessionStoreProvider = sessionContext.provider;

export function useSessionRoute(): SessionRoute {
  return sessionContext.useFeatureSelector(selectSessionRoute);
}

/** Who is signed in, or `null` when signed out. */
export function useSessionUser(): SessionUser | null {
  return sessionContext.useFeatureSelector(selectSessionUser);
}

export function useSignedOutReason(): SignedOutReason | null {
  return sessionContext.useFeatureSelector(selectSignedOutReason);
}

export interface SessionCommands {
  readonly signIn: (user: SessionUser) => void;
  readonly signOut: () => void;
}

/** Stable commands; the root guard moves the app when the session changes. */
export function useSessionCommands(): SessionCommands {
  const { dispatch } = sessionContext.useFeatureStore();
  return React.useMemo(
    (): SessionCommands => ({
      signIn: (user: SessionUser): void => {
        dispatch(sessionActions.signedIn(user));
      },
      signOut: (): void => {
        dispatch(sessionActions.signedOut());
      },
    }),
    [dispatch]
  );
}
