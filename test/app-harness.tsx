// The providers a screen-level component needs under test: safe-area insets (fixed metrics, as on a
// phone with no notch), and the toast store with its host, as the shell gives every signed-in screen —
// so a test reads a toast's words on the screen. A slimmed copy of the reference's harness; `createTestRuntime` builds
// the app runtime (environment, stores) a screen reads through the runtime context.

import * as React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { RawMobileEnv } from "../src/lib/env";
import type { ThemePreference } from "../src/lib/secure-store";
import type { PreferencesState } from "../src/features/preferences/state";
import { createAppRuntime, type AppRuntimeInputs, type ReadyAppRuntime } from "../src/runtime/app-runtime";

import { ToastStoreProvider } from "../src/features/toast/facade";
import { createToastStore } from "../src/features/toast/store";
import { ToastHost } from "../src/features/toast/toast-host";
import { trackQueryClient } from "./query-clients";

/** The environment the tests run with: development, no API, JSONPlaceholder for the Team list (src/lib/env.ts). */
export const TEST_RAW_ENV: RawMobileEnv = {
  isDevelopment: true,
  apiUrl: undefined,
  apiPort: undefined,
  iosStoreUrl: undefined,
  androidStoreUrl: undefined,
  showDemoAccount: undefined,
  allowLanHttpApi: undefined,
  jsonPlaceholderUrl: undefined,
};

export interface TestRuntimeOverrides {
  readonly rawEnv?: RawMobileEnv;
  readonly applyTheme?: (theme: ThemePreference) => void;
  readonly savePreferences?: (preferences: PreferencesState) => Promise<void>;
}

export function testRuntimeInputs(overrides: TestRuntimeOverrides = {}): AppRuntimeInputs {
  return {
    rawEnv: overrides.rawEnv ?? TEST_RAW_ENV,
    appName: "hello-world",
    appVersion: "1.0.0",
    buildNumber: null,
    applyTheme: overrides.applyTheme ?? jest.fn(),
    savePreferences: overrides.savePreferences ?? jest.fn((): Promise<void> => Promise.resolve()),
    reportWarning: jest.fn(),
  };
}

/** A test asked for a ready runtime, but its environment is a configuration error. */
export class UnexpectedConfigErrorRuntime extends Error {}

/** A ready app runtime for a test (its query client is disposed after the test). */
export function createTestRuntime(overrides: TestRuntimeOverrides = {}): ReadyAppRuntime {
  const runtime = createAppRuntime(testRuntimeInputs(overrides));
  if (runtime.kind !== "ready") {
    throw new UnexpectedConfigErrorRuntime(runtime.issue.message);
  }
  trackQueryClient(runtime.queryClient);
  return runtime;
}

/** Insets and a frame for the safe-area provider: Jest has no device to measure. */
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
/** The toast's top under test: there is no header to sit below. */
const TOAST_TOP = 0;

export interface AppProvidersProps {
  readonly children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): React.JSX.Element {
  const [toastStore] = React.useState(createToastStore);
  return (
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ToastStoreProvider store={toastStore}>
        {children}
        <ToastHost top={TOAST_TOP} />
      </ToastStoreProvider>
    </SafeAreaProvider>
  );
}
