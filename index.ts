// The app's entry point (package.json → main). The WHATWG URL polyfill loads FIRST: React Native's
// built-in `URL` / `URLSearchParams` are partial (a base URL with a path is concatenated, not
// resolved), and zod's URL checks (the QR scanner's link check) rely on the standard behaviour.
// Then Expo Router takes over. The stylesheet is imported by the root layout (src/app/_layout.tsx),
// never here.

import "react-native-url-polyfill/auto";
import "expo-router/entry";
