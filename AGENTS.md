# AGENTS.md

The live, load-bearing instructions for every AI coding agent working in this repository (Claude Code,
Cursor, Codex, Copilot, …). The canonical long-form version is [`rules/17-ai-agent-prompts.md`](rules/17-ai-agent-prompts.md);
keep the two in sync. Tool-specific connector files only point here: [`CLAUDE.md`](CLAUDE.md),
[`.cursor/rules/`](.cursor/rules/). Codex reads this file natively.

**This is a starter kit other products are built on. There is no acceptable shortcut — do everything the
documented way, every time, even for something that looks small.**

## What this repository is

A single **Expo SDK 58** app (React 19.3, React Native 0.88, Expo Router, Uniwind on Tailwind v4,
TanStack Query, Zustand, zod), managed with **pnpm**.

The documents in `rules/` were written for the full NestJS + Next.js + Expo monorepo this app belongs to.
Here, only the mobile app exists, so read them through this mapping:

| `rules/` says | In this repository |
|---|---|
| `apps/mobile/src/…` (`app/`, `components/`, `features/`, `contexts/`, `lib/`, `runtime/`) | the same folders under `src/` |
| `packages/oxlint-config`, `restricted-syntax-rules.js`, `workspace/*` rules | [`oxlint.config.mts`](oxlint.config.mts) + [`tooling/oxlint-plugin-workspace/`](tooling/oxlint-plugin-workspace/) |
| `.oxfmtrc.json` | [`.oxfmtrc.json`](.oxfmtrc.json) |
| `packages/tokens`, `pnpm tokens:generate`, `mobile.css` | the token source in [`src/tokens/`](src/tokens/); `pnpm run tokens:generate` writes [`src/styles/tokens.css`](src/styles/tokens.css) (themes light, dark, nord) and the launch assets. Never edit the generated files by hand — a test fails while they are stale |
| `packages/ui-native` (`@workspace/ui-native/…`) | the UI kit in [`src/ui/`](src/ui/) (`@/ui/components/…`, `@/ui/lib/…`) |
| `packages/shared` (`@workspace/shared`) | the vendored subset in [`src/shared/`](src/shared/) (`@/shared`) |
| `apps/api`, `apps/web`, Prisma, Kafka/BullMQ, S3, tenants | not in this repo — those rules apply only when the code they govern is added |
| `@workspace/api-client`, real sessions | none: the app is UI-only. The session is a local demo (`src/features/session`) and screens use sample data |

## Before writing code

1. Read this file, then [`rules/00-non-negotiables.md`](rules/00-non-negotiables.md).
2. Read the documents the routing table below names for your task — not all of `rules/`.
3. Inspect the existing code and reuse its patterns; do not invent architecture an existing pattern covers.
4. Make a short plan: affected files, boundaries, validation, accessibility, docs.
5. Implement incrementally, then run the completion gate.

## Routing table — what to read for which task

| Task | Read |
|---|---|
| Any code change | `00-non-negotiables`, `27-array-index-readability`, `28-runtime-validation`, `25-anti-pattern-catalog` |
| Screens, navigation, device features, storage | `04-mobile-expo` |
| UI components, styling, theming, icons, animation | `07-ui-system`, `04-mobile-expo` (Styling, Typography, Icons rows) |
| Server state, forms, client state | `06-tanstack-state-forms-tables` |
| API calls, schemas, contracts | `05-contracts-zod-api`, `28-runtime-validation` |
| Auth, tokens, secure storage, PII | `10-security-auth-authorization` (mobile and client sections), `04-mobile-expo` (Storage, App lock) |
| Classes, interfaces, abstractions | `21-oop-and-solid-principles` |
| Performance | `19-performance-and-scalability` |
| Tests | `11-testing-vitest` (the jest-expo exception for mobile) |
| Lint, CI, tooling | `13-ci-cd-and-quality-gates` |
| Docs, ADRs, keeping this file in sync | `14-documentation` |
| Planning a feature, reviewing, finishing | `15-feature-development-process`, `16-code-review-checklist`, `18-definition-of-done` |
| "Which way do I go?" | `23-quick-reference-decision-trees`, `24-golden-reference-implementations` |
| Vocabulary | `22-glossary` |
| New to the codebase | `26-junior-onboarding-guide` |
| Backend / web / database / messaging / storage / DDD / CQRS / tenancy | `02`, `03`, `08`, `09`, `20`, `29`, `30`, `31` — only once that code exists here |

## Non-negotiables (full text: `rules/00`)

- No `any`, `unknown` (except a `catch` / `.catch()` error parameter), `never` (except `assertNever`),
  `z.any()` / `z.unknown()` / `z.never()`, `as` casts, `as const`, `<T>` casts, non-null `!`.
- No runtime `typeof`, `Array.isArray` or `Object.prototype.toString.call` — zod parses once at each trust
  boundary and `z.infer<>` flows inward (`rules/28`). Component props are not a boundary: type them, don't parse them.
- No numeric-literal indices (`items[0]`) — destructure, use named RegExp groups or a literal-typed index map (`rules/27`).
- Explicit return types and explicit access modifiers. No magic values, no dead or commented-out code,
  no speculative abstractions. TanStack Query owns server state; Zustand never mirrors it.

## Mobile conventions (full text: `rules/04`, `rules/07`)

- **Styling** is Uniwind className utilities over the semantic tokens in `global.css` (`bg-card`,
  `text-muted-foreground`, `border-border`, `bg-info-surface`, …). Colour literals and inline style
  objects fail lint. Colour props take an `accent-*` utility through `*ClassName` props
  (`colorClassName`, `placeholderTextColorClassName`). Third-party components need `withUniwind(...)` once
  at module scope before `className` works on them.
- **Theme**: preferences live in `src/features/preferences` (`useThemePreference()`, `usePreferencesCommands().themeChanged(...)`),
  applied with `Uniwind.setTheme`. Light/dark differences are tokens or `dark:` variants, never `isDark ? a : b` colour logic.
- **Text** goes through the kit's text roles (`Heading`, `Subheading`, `BodyText`, `MutedText`, `Label`, `ErrorText`
  in `@/ui/components/text`) or a `<Text>` with a font utility. Each weight is its own family: `font-sans`,
  `font-sans-medium`, `font-sans-semibold`, `font-sans-bold`, `font-heading`, `font-mono`. Never `font-medium` / `font-semibold` / `font-bold`.
- **Icons** are Lucide glyphs imported one by one (`lucide-react-native/icons/<name>`) and rendered through
  `@/ui/components/icon` with an `accent-*` colour class.
- **Accessibility**: every pressable has `accessibilityRole` and `accessibilityLabel`; `TextInput` and
  `Image` have `accessibilityLabel`; `Button` requires `accessibilityLabel`.
- **Animation** is Reanimated 4 (`useAnimatedStyle` passed as a variable); React Native's `Animated` is banned.
- **Safe areas**: `pt-safe`, `pb-safe-offset-4`, … (insets are fed to Uniwind in `app/_layout.tsx`).
- **Storage**: `expo-secure-store` only, parsed with zod on read. Never AsyncStorage.
- **Installs**: Expo-managed packages with `pnpm exec expo install <pkg>`; everything else with `pnpm add`.

## Completion gate

Run after your **last** edit, from the repository root:

```bash
pnpm run lint                    # oxfmt --check, then oxlint (type-aware) — zero errors, zero warnings
pnpm run typecheck               # tsrs --noEmit — zero errors
pnpm run test                    # jest-expo — all green
pnpm exec expo install --check   # Expo SDK package versions aligned
```

`pnpm run format` applies oxfmt (with Tailwind class sorting) and `oxlint --fix`.

- If any command fails, fix the root cause and re-run **all** of them. A green run followed by more edits
  no longer counts.
- Never make the gate pass with `oxlint-disable` / `eslint-disable`, `@ts-ignore` / `@ts-expect-error`,
  casts, ignore patterns, or edits to the gate's configuration. If a rule seems wrong, stop and ask a human.
- Tests live in `__tests__/` beside the code (route-screen tests in `src/__tests__/app/`, never inside
  `src/app/`); `jest.setup.ts` mocks only native boundaries (Uniwind, secure-store, blur, keyboard, worklets).
- If you cannot run a command, report it as **NOT VERIFIED**, never "done".

The gate's own configuration — `oxlint.config.mts`, `tooling/oxlint-plugin-workspace/`, `.oxfmtrc.json`,
`tsconfig.json`, `jest.config.js` and the `lint` / `format` / `typecheck` / `test` scripts — changes only with maintainer review.

## Stop and ask instead of guessing

- A request that needs a non-negotiable broken to work at all.
- Anything that weakens authentication, authorization or secure storage.
- Two genuinely different architectures where guessing wrong means significant rework.
- Real user data, real credentials or real money.

## Reporting

End every task with: summary, files changed, the gate commands you ran and their results, decisions made,
documentation updated, and remaining risks or shortcuts — called out explicitly, never left for a reviewer
to discover (`rules/17`, "Reporting template").
