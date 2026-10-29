// The app runtime wired to the real device: the environment, the app's identity from the manifest,
// Uniwind and Secure Store.

import Constants from "expo-constants";

import { savePreferences } from "../features/preferences/persistence";
import { applyThemePreference } from "../features/preferences/theme";
import { readRawMobileEnv } from "../lib/env";
import { createAppRuntime, type AppRuntime } from "./app-runtime";

/** Shown when the manifest has no name or version (never in a real build). */
const FALLBACK_APP_NAME = "App";
const FALLBACK_APP_VERSION = "0.0.0";

export function createDeviceAppRuntime(): AppRuntime {
  return createAppRuntime({
    rawEnv: readRawMobileEnv(),
    appName: Constants.expoConfig?.name ?? FALLBACK_APP_NAME,
    appVersion: Constants.expoConfig?.version ?? FALLBACK_APP_VERSION,
    // Expo Go has no build number of its own; a native build can read it with expo-application.
    buildNumber: null,
    applyTheme: applyThemePreference,
    savePreferences,
    reportWarning: (message: string, error: Error): void => {
      console.warn(message, error);
    },
  });
}
