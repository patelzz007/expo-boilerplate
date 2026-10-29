// The preferences facade: the only module screens import (ADR 023).

import * as React from "react";

import type { ThemePreference } from "../../lib/secure-store";
import { createFeatureStoreContext } from "../../lib/state/feature-store-context";
import { preferencesActions, type PreferencesAction } from "./actions";
import { selectOnboardingCompleted, selectTheme } from "./selectors";
import type { PreferencesState } from "./state";

const preferencesContext = createFeatureStoreContext<PreferencesState, PreferencesAction>("Preferences");

export const PreferencesStoreProvider = preferencesContext.provider;

export function useThemePreference(): ThemePreference {
  return preferencesContext.useFeatureSelector(selectTheme);
}

/** Whether this device has been through onboarding (the root guard reads it). */
export function useOnboardingCompleted(): boolean {
  return preferencesContext.useFeatureSelector(selectOnboardingCompleted);
}

export interface PreferencesCommands {
  readonly themeChanged: (theme: ThemePreference) => void;
  readonly onboardingCompleted: () => void;
  readonly onboardingReset: () => void;
}

export function usePreferencesCommands(): PreferencesCommands {
  const { dispatch } = preferencesContext.useFeatureStore();
  return React.useMemo(
    (): PreferencesCommands => ({
      themeChanged: (theme: ThemePreference): void => {
        dispatch(preferencesActions.themeChanged(theme));
      },
      onboardingCompleted: (): void => {
        dispatch(preferencesActions.onboardingCompleted());
      },
      onboardingReset: (): void => {
        dispatch(preferencesActions.onboardingReset());
      },
    }),
    [dispatch]
  );
}
