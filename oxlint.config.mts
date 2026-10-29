import { defineConfig } from "oxlint";

// The lint gate (rules/13-ci-cd-and-quality-gates.md). Every category is off: the rule set is the
// explicit list below, so an oxlint upgrade never changes the gate on its own. Every rule is `error`.

interface RestrictedImportPath {
  readonly name: string;
  readonly importNames?: readonly string[];
  readonly message: string;
}

const NODE_BUILTINS: readonly string[] = [
  "assert",
  "buffer",
  "child_process",
  "crypto",
  "events",
  "fs",
  "fs/promises",
  "http",
  "https",
  "net",
  "os",
  "path",
  "stream",
  "url",
  "util",
  "zlib",
];

const MOBILE_BOUNDARY_PATHS: readonly RestrictedImportPath[] = [
  { name: "react-dom", message: "DOM-only package; the app is native-only (rules/04)." },
  { name: "next", message: "Next.js is not part of the mobile runtime (rules/04)." },
  {
    name: "@react-native-async-storage/async-storage",
    message: "Never AsyncStorage: persist through expo-secure-store (rules/04).",
  },
  ...NODE_BUILTINS.map((name) => ({ name, message: "Node built-ins do not exist on Hermes (rules/04)." })),
];

const REACT_NATIVE_PRIMITIVES: RestrictedImportPath = {
  name: "react-native",
  importNames: ["Animated", "SafeAreaView"],
  message: "Use Reanimated for animation and SafeAreaView from react-native-safe-area-context (rules/04).",
};

interface RestrictedImportPattern {
  readonly group: readonly string[];
  readonly message: string;
}

const NODE_PROTOCOL_PATTERN: RestrictedImportPattern = {
  group: ["node:*"],
  message: "Node built-ins do not exist on Hermes (rules/04).",
};

const ICON_FONT_PATTERN: RestrictedImportPattern = {
  group: ["@expo/vector-icons", "@expo/vector-icons/*"],
  message: "Icons are Lucide glyphs rendered through `@/ui/components/icon` (rules/04).",
};

const LUCIDE_BARREL_PATH: RestrictedImportPath = {
  name: "lucide-react-native",
  message:
    "Import each glyph on its own (`lucide-react-native/icons/<name>`) and render it through `@/ui/components/icon` (rules/04).",
};

function restrictedImports(
  paths: readonly RestrictedImportPath[],
  patterns: readonly RestrictedImportPattern[] = [NODE_PROTOCOL_PATTERN, ICON_FONT_PATTERN]
): ["error", object] {
  return ["error", { paths, patterns }];
}

export default defineConfig({
  categories: {
    correctness: "off",
    suspicious: "off",
    pedantic: "off",
    perf: "off",
    style: "off",
    restriction: "off",
    nursery: "off",
  },
  plugins: ["eslint", "typescript", "react", "import", "unicorn", "promise"],
  jsPlugins: [{ name: "workspace", specifier: "./tooling/oxlint-plugin-workspace/index.mjs" }],
  env: { builtin: true, es2024: true },
  globals: { __DEV__: "readonly" },
  ignorePatterns: ["uniwind-types.d.ts", "expo-env.d.ts", ".expo/**", "node_modules/**", "dist/**"],
  options: {
    typeAware: true,
    reportUnusedDisableDirectives: "error",
  },
  rules: {
    // Correctness
    "eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "all" }],
    "eslint/no-console": ["error", { allow: ["warn", "error"] }],
    "eslint/no-debugger": "error",
    "eslint/no-var": "error",
    "eslint/prefer-const": "error",
    "eslint/eqeqeq": ["error", "always", { null: "ignore" }],
    "eslint/no-unneeded-ternary": "error",
    "eslint/no-useless-rename": "error",
    "eslint/no-self-compare": "error",
    "eslint/no-unused-expressions": "error",
    "eslint/no-useless-escape": "error",
    "eslint/no-useless-catch": "error",
    "eslint/no-empty": "error",
    "eslint/no-fallthrough": "error",
    "eslint/no-dupe-keys": "error",
    "eslint/no-duplicate-case": "error",
    "eslint/no-unreachable": "error",
    "eslint/no-restricted-imports": restrictedImports([
      ...MOBILE_BOUNDARY_PATHS,
      REACT_NATIVE_PRIMITIVES,
      LUCIDE_BARREL_PATH,
    ]),

    // TypeScript — the non-negotiables (rules/00)
    "typescript/no-explicit-any": "error",
    "typescript/consistent-type-assertions": ["error", { assertionStyle: "never" }],
    "typescript/no-non-null-assertion": "error",
    "typescript/ban-ts-comment": "error",
    "typescript/explicit-function-return-type": [
      "error",
      { allowExpressions: true, allowTypedFunctionExpressions: true, allowHigherOrderFunctions: true },
    ],
    "typescript/explicit-member-accessibility": "error",
    "typescript/consistent-type-imports": "error",
    "typescript/array-type": "error",
    "typescript/no-empty-object-type": "error",
    "typescript/no-unsafe-function-type": "error",
    "typescript/no-wrapper-object-types": "error",

    // TypeScript — type-aware (oxlint-tsgolint)
    "typescript/no-floating-promises": "error",
    "typescript/no-misused-promises": "error",
    "typescript/await-thenable": "error",
    "typescript/no-unsafe-argument": "error",
    "typescript/no-unsafe-assignment": "error",
    "typescript/no-unsafe-call": "error",
    "typescript/no-unsafe-member-access": "error",
    "typescript/no-unsafe-return": "error",
    "typescript/no-unnecessary-type-assertion": "error",
    "typescript/no-redundant-type-constituents": "error",
    "typescript/switch-exhaustiveness-check": "error",
    "typescript/prefer-readonly": "error",
    "typescript/restrict-template-expressions": "error",
    "typescript/no-base-to-string": "error",

    // React
    "react/rules-of-hooks": "error",
    "react/exhaustive-deps": "error",
    "react/refs": "error",
    "react/immutability": "error",
    "react/static-components": "error",
    "react/jsx-key": "error",
    "react/no-array-index-key": "error",
    "react/jsx-no-useless-fragment": "error",
    "react/no-unstable-nested-components": "error",
    "react/jsx-no-duplicate-props": "error",
    "react/self-closing-comp": "error",
    "react/no-children-prop": "error",

    // Imports
    "import/no-cycle": "error",
    "import/no-duplicates": "error",
    "import/no-self-import": "error",

    // Promises
    "promise/no-return-wrap": "error",
    "promise/param-names": "error",

    // Repository rules (tooling/oxlint-plugin-workspace)
    "workspace/no-raw-text": [
      "error",
      { textComponents: ["Text", "Heading", "Subheading", "BodyText", "MutedText", "Label", "ErrorText"] },
    ],
    "workspace/accessible-elements": "error",
    "workspace/no-inline-styles": "error",
    "workspace/no-color-literals": "error",
    "workspace/no-font-weight-utilities": "error",
  },
  overrides: [
    {
      // rules/00, rules/27, rules/28: every TypeScript file, no exemptions.
      files: ["**/*.ts", "**/*.tsx"],
      rules: { "workspace/restricted-syntax": "error" },
    },
    {
      // The icon primitive is the one place the Lucide barrel (for its `LucideIcon` type) is imported.
      files: ["src/ui/components/icon.tsx"],
      rules: {
        "eslint/no-restricted-imports": restrictedImports([...MOBILE_BOUNDARY_PATHS, REACT_NATIVE_PRIMITIVES]),
      },
    },
    {
      // Jest suites and their helpers (jest-expo, rules/11).
      files: ["**/__tests__/**", "test/**", "jest.setup.ts"],
      env: { jest: true },
    },
    {
      // The design token source is where colour values are defined — the one place literals belong.
      files: ["src/tokens/**"],
      rules: { "workspace/no-color-literals": "off" },
    },
    {
      // The QR encoder's SVG renderer takes its module colours as data (validated hex strings it writes
      // into the SVG), not styling.
      files: ["src/shared/lib/qr/qr-svg.ts", "src/shared/lib/qr/__tests__/qr-svg.test.ts"],
      rules: { "workspace/no-color-literals": "off" },
    },
    {
      // The token generator's file writer and its checks run on Node (`pnpm run tokens:generate`), not Hermes.
      files: ["scripts/**", "src/tokens/generator/__tests__/**"],
      env: { node: true },
      rules: { "eslint/no-restricted-imports": "off" },
    },
    {
      // Build tooling is plain JavaScript run by Node (Babel, Metro, the lint plugin), not app code on
      // Hermes: it has no static types for the type-aware rules to check, and Node built-ins are fine.
      files: ["*.config.js", "tooling/**/*.mjs"],
      env: { node: true },
      rules: {
        "eslint/no-restricted-imports": "off",
        "typescript/explicit-function-return-type": "off",
        "typescript/no-unsafe-argument": "off",
        "typescript/no-unsafe-assignment": "off",
        "typescript/no-unsafe-call": "off",
        "typescript/no-unsafe-member-access": "off",
        "typescript/no-unsafe-return": "off",
      },
    },
  ],
});
