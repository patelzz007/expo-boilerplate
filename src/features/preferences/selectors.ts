import type { ThemePreference } from "../../lib/secure-store";
import type { PreferencesState } from "./state";

export function selectTheme(state: PreferencesState): ThemePreference {
  return state.theme;
}

export function selectOnboardingCompleted(state: PreferencesState): boolean {
  return state.onboardingCompleted;
}
