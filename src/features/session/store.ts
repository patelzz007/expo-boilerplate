import { createFeatureStore, type FeatureEffect, type FeatureStore } from "../../lib/state/feature-store";
import type { SessionAction } from "./actions";
import { sessionReducer } from "./reducer";
import { INITIAL_SESSION_STATE, type SessionState } from "./state";

export type SessionStore = FeatureStore<SessionState, SessionAction>;

export interface SessionStoreDependencies {
  /** Drops every cached response (the query cache) — called whenever the signed-in user is gone. */
  readonly clearServerState: () => void;
}

/** Signing out clears every cached response of the previous user. */
function clearServerStateEffect(dependencies: SessionStoreDependencies): FeatureEffect<SessionState, SessionAction> {
  return (action: SessionAction): void => {
    if (action.type === "[ Session ] Signed Out") {
      dependencies.clearServerState();
    }
  };
}

/** Creates the session store — once per app start (src/runtime/app-runtime.ts). */
export function createSessionStore(dependencies: SessionStoreDependencies): SessionStore {
  return createFeatureStore<SessionState, SessionAction>({
    initialState: INITIAL_SESSION_STATE,
    reducer: sessionReducer,
    effects: [clearServerStateEffect(dependencies)],
  });
}
