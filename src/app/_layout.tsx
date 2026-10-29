// ============================================
// _layout.tsx - the root layout: stylesheet, app runtime, root guard (§9.4, §9.6)
// ============================================
// The Uniwind stylesheet is imported HERE (ADR 032), never in the entry file.
// `KeyboardProvider` wraps everything: every keyboard-avoiding view
// (src/ui/components/keyboard-avoiding-view.tsx) reads the keyboard from it,
// in the app's window and in every sheet's.
//
// The app draws edge to edge (Expo SDK 58 makes it mandatory on Android), so the provider is told the
// system bars are translucent. Its own edge-to-edge detection reads a React Native constant that Expo
// Go does not set: left to itself it pads the whole app away from the status bar and the navigation
// bar, leaving page-coloured strips that nothing (the header, the drawer, its scrim) can cover.

import "../../global.css";

import * as SplashScreen from "expo-splash-screen";
import * as React from "react";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { useAppFonts } from "../lib/fonts";
import { createDeviceAppRuntime } from "../runtime/device-runtime";
import { AppShell } from "../runtime/app-shell";

// Keep the splash screen up until the fonts can draw the launch screen.
SplashScreen.preventAutoHideAsync().catch((): void => {
  // Already prevented (fast refresh in development).
});

export default function RootLayout(): React.JSX.Element {
  const [runtime] = React.useState(createDeviceAppRuntime);
  // The typefaces load while the app runtime starts; the splash screen waits for both (ADR 037).
  const fontsReady = useAppFonts();

  return (
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
      <AppShell runtime={runtime} fontsReady={fontsReady} />
    </KeyboardProvider>
  );
}
