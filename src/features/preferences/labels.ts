// Display labels of the preference values (one place, so Settings and its sub-screens agree).

import type { ThemePreference } from "../../lib/secure-store";
import type { RadioOption } from "@/ui/components/radio-group";

export const THEME_OPTIONS: readonly RadioOption<ThemePreference>[] = [
  { value: "system", label: "System", description: "Follow the device's light or dark setting" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "nord", label: "Nord", description: "A dark theme in Nord's arctic blues" },
];

export const THEME_LABELS: Readonly<Record<ThemePreference, string>> = {
  system: "System",
  light: "Light",
  dark: "Dark",
  nord: "Nord",
};

/** Confirmations of preference changes, shown as a toast. */
export const PREFERENCE_MESSAGES = {
  themeChanged: (theme: ThemePreference): string => `Theme set to ${THEME_LABELS[theme]}.`,
};
