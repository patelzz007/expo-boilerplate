// ============================================
// app-runtime.ts - everything the app builds once per start (§9.4)
// ============================================
// The app's name and version, the query client, and the session and preferences stores. Nothing here
// runs at module scope; the root layout calls `createAppRuntime` once.

import type { QueryClient } from "@tanstack/react-query";

import { clearQueryClient, createMobileQueryClient } from "../lib/query-client";
import type { ThemePreference } from "../lib/secure-store";
import { preferencesActions } from "../features/preferences/actions";
import type { PreferencesState } from "../features/preferences/state";
import { createPreferencesStore, type PreferencesStore } from "../features/preferences/store";
import { createSessionStore, type SessionStore } from "../features/session/store";

export interface ReadyAppRuntime {
  readonly appName: string;
  readonly appVersion: string;
  /** The native build number, or `null` when the build reports none (Expo Go). */
  readonly buildNumber: string | null;
  readonly queryClient: QueryClient;
  readonly sessionStore: SessionStore;
  readonly preferencesStore: PreferencesStore;
}

/** What the runtime reads from the device and the build (injected, so tests pass their own). */
export interface AppRuntimeInputs {
  readonly appName: string;
  readonly appVersion: string;
  readonly buildNumber: string | null;
  readonly applyTheme: (theme: ThemePreference) => void;
  readonly savePreferences: (preferences: PreferencesState) => Promise<void>;
  /** A non-fatal problem worth a developer's attention (a preference that could not be saved). */
  readonly reportWarning: (message: string, error: Error) => void;
}

export function createAppRuntime(inputs: AppRuntimeInputs): ReadyAppRuntime {
  const queryClient = createMobileQueryClient();
  const sessionStore = createSessionStore({
    clearServerState: (): void => {
      clearQueryClient(queryClient);
    },
  });
  const preferencesStore = createPreferencesStore({
    applyTheme: inputs.applyTheme,
    save: inputs.savePreferences,
    onSaveFailed: (error: Error): void => {
      inputs.reportWarning("A preference could not be saved; it applies until the app restarts.", error);
    },
  });
  return {
    appName: inputs.appName,
    appVersion: inputs.appVersion,
    buildNumber: inputs.buildNumber,
    queryClient,
    sessionStore,
    preferencesStore,
  };
}

/** The start sequence: the stored preferences (the theme is applied before the first frame). */
export async function startAppRuntime(
  runtime: ReadyAppRuntime,
  loadPreferences: () => Promise<PreferencesState>
): Promise<void> {
  const preferences = await loadPreferences();
  runtime.preferencesStore.dispatch(preferencesActions.restored(preferences));
}
