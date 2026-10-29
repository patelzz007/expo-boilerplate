// Home: a stack inside the Home tab (rules/04, nested layouts) — Home, then a team member opened
// from its list.

import { Stack } from "expo-router";
import * as React from "react";

import { PUSH_TRANSITION } from "../../../lib/screen-transitions";

const SCREEN_OPTIONS = { headerShown: false, animation: PUSH_TRANSITION } satisfies React.ComponentProps<
  typeof Stack
>["screenOptions"];

/** Home is always the stack's first screen, even when a team member is opened directly: going back from it lands on Home. */
const HOME_STACK_SETTINGS = { anchor: "index" };

// Expo Router reads the stack's settings from this exact export name.
export { HOME_STACK_SETTINGS as unstable_settings };

export default function HomeLayout(): React.JSX.Element {
  return <Stack screenOptions={SCREEN_OPTIONS} />;
}
