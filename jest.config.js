// jest-expo for the app (rules/11, "The one exception to Vitest"): React Native's transforms and
// native-module mocks are built for Jest. Tests live in `__tests__/` folders beside the code they
// test; the route screens' tests live in src/__tests__/app/ (never inside src/app/: Expo Router
// bundles every file there). test/ holds the shared test helpers.

/** @type {import("jest").Config} */
module.exports = {
  preset: "jest-expo",
  // Reanimated and Worklets run their JavaScript build under Jest (their own resolver).
  resolver: "react-native-reanimated/jest/resolver",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    // Uniwind compiles CSS in Metro; tests render without styles.
    "\\.css$": "<rootDir>/test/style-mock.cjs",
    // Lucide's React Native build is ES modules only; tests load the same release's CommonJS build.
    "^lucide-react-native/icons/(.*)$": "<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/$1.js",
    "^lucide-react-native$": "<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js",
    // The `@/` import alias (tsconfig.json).
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}",
    "<rootDir>/test/__tests__/**/*.test.{ts,tsx}",
    "<rootDir>/config-plugins/__tests__/**/*.test.ts",
  ],
  clearMocks: true,
  restoreMocks: true,
};
