// The providers a screen-level component needs under test: safe-area insets (fixed metrics, as on a
// phone with no notch), and the toast store with its host, as the shell gives every signed-in screen —
// so a test reads a toast's words on the screen. A slimmed copy of the reference's harness: this app has
// no API runtime to stand up.

import * as React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ToastStoreProvider } from "../src/features/toast/facade";
import { createToastStore } from "../src/features/toast/store";
import { ToastHost } from "../src/features/toast/toast-host";

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
