import { assertNever } from "@/shared";

import type { PreferencesAction } from "./actions";
import type { PreferencesState } from "./state";

/** Pure preference transitions — persistence and theme application are effects (store.ts). */
export function preferencesReducer(state: PreferencesState, action: PreferencesAction): PreferencesState {
  switch (action.type) {
    case "[ Preferences ] Restored":
      return action.preferences;
    case "[ Preferences ] Theme Changed":
      return { ...state, theme: action.theme };
    case "[ Preferences ] Onboarding Completed":
      return { ...state, onboardingCompleted: true };
    case "[ Preferences ] Onboarding Reset":
      return { ...state, onboardingCompleted: false };
    default:
      return assertNever(action, "preferences action");
  }
}
