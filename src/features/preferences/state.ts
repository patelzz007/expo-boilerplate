import type { ThemePreference } from "../../lib/secure-store";

/**
 * The device-only preferences: the appearance, and whether this device has been through onboarding
 * (ADR 041). Owner: this feature store; persisted in Secure Store (never AsyncStorage) and restored
 * before the first frame.
 */
export interface PreferencesState {
  readonly theme: ThemePreference;
  /** The first-launch walkthrough was finished or skipped; it never shows again on this device. */
  readonly onboardingCompleted: boolean;
}

/** Defaults: follow the OS; onboarding not seen yet. */
export const DEFAULT_PREFERENCES: PreferencesState = {
  theme: "system",
  onboardingCompleted: false,
};
