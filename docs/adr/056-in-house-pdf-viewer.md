# ADR 056: An In-House PDF Viewer on Each Platform's Own PDF Engine

## Status

Accepted (2026-10-29) in this repository. It follows the starter kit's ADR 056 (2026-10-17, amended
2026-10-29), applied to the only app here: the mobile one. The kit's web and docs parts do not apply.

## Context

The app shows PDFs (Settings → PDF viewer, and attachments). The usual answer is a PDF library
(react-native-pdf, react-native-pdf-renderer). **No third-party PDF library is allowed.** Writing a PDF
renderer ourselves (parser, compression, embedded fonts, images, encryption) would take weeks and still
draw many real PDFs wrongly.

Both platforms already ship a mature PDF engine: iOS has **PDFKit**, Android has
**`android.graphics.pdf.PdfRenderer`** (API 21+).

Before this change the JavaScript half of the viewer was already here (the kit's `PdfViewer`, the
`pdf-viewer` feature, `@/shared` PDF rules), but `modules/pdf-renderer` held only
`expo-module.config.json`. Its Swift and Kotlin sources were missing, so a development or store build had
no engine. Expo Go was unaffected, because it always falls back to the system viewer.

## Decision

1. **The platform's engine draws the pages; the kit owns everything around them.** That covers the toolbar,
   zoom, the virtualised page list, file checks, and the loading, empty, failure and unsupported states
   (`@/ui/components/pdf-viewer`, `src/features/pdf-viewer`).
2. **Shared rules live in `@/shared`** (`src/shared/lib/pdf`): `checkPdfFile` (the 50 MiB limit and the
   `%PDF-` header), the closed `PdfOpenFailure` list, `pdfFileName`, and `buildTextPdf` for demos and
   tests, so no binary fixtures are committed.
3. **The engine is a local Expo module, `modules/pdf-renderer`**, written in-house:
   - **Swift on PDFKit** (`ios/PdfRendererModule.swift`, `ios/PdfRenderer.podspec`).
   - **Kotlin on `PdfRenderer`** (`android/build.gradle`,
     `android/src/main/java/expo/modules/pdfrenderer/PdfRendererModule.kt`).
   - It is **stateless**: every call opens the file.
     - `openDocument(fileUri)` answers each page's size in points, turned by the page's rotation.
     - `renderPage(fileUri, pageIndex, widthPx)` draws one page on white to a PNG in the app's cache and
       answers its `file://` address.
   - The PNG's file name is a SHA-256 of the file URI, its modification time, the page and the width. So a
     page is drawn once per zoom level, and a changed file is redrawn.
   - It rejects with four codes:
     - `ERR_PDF_PASSWORD_PROTECTED`
     - `ERR_PDF_UNREADABLE`
     - `ERR_PDF_INVALID_REQUEST`
     - `ERR_PDF_RENDER_FAILED`

     `pdf-engine.ts` maps them to `PdfOpenFailure`.
4. **JavaScript treats the module as untrusted.**
   - It is loaded with `requireOptionalNativeModule("PdfRenderer")`, which returns `null` in Expo Go and in
     Jest.
   - Its answers are parsed with zod (`pdf-renderer-module.ts`).
   - Renders are capped at 2,048 px wide (`MAX_PDF_PAGE_RENDER_WIDTH_PX`).
   - Zoom runs from 100 % to 300 % and never goes below fit-width.
5. **In Expo Go**, which cannot load custom native code, the viewer hands the checked file to the system's
   PDF viewer through `expo-sharing`. Files are picked with `expo-document-picker`. Both are first-party
   Expo modules that Expo Go ships.
6. **`rules/04` allows exactly this kind of exception.** A local module may live under `modules/` only when
   it meets both conditions:
   - it wraps an API the OS ships, with no third-party native code;
   - its feature has a designed Expo Go fallback.
7. **A local module's `ios/` and `android/` folders are source, and are committed.** `.gitignore` anchors
   the generated projects to the root (`/ios`, `/android`) and ignores only Gradle's output inside a module
   (`modules/*/android/build/`, `modules/*/android/.gradle/`).

## Consequences

- No PDF library in `package.json`.
- In-app pages need a development or store build (`npx expo run:android|ios`). Expo Go users get the
  system viewer instead.
- The Swift and Kotlin cannot run in Jest, so they are kept thin: no logic that needs a test lives there.
  - The JavaScript contract is tested through a fake module (`pdf-engine.test.ts`,
    `use-pdf-document.test.tsx`).
  - Nothing yet checks the native sources against that contract in the gate. The test that would do it
    needs a lint override first (see [Open question](#open-question-a-native-sources-test)).
- A product that later needs annotations, text selection or identical rendering everywhere should revisit
  this ADR rather than grow the viewer into a PDF engine.

## Alternatives considered

- **react-native-pdf / react-native-pdf-renderer.** Rejected: no third-party PDF libraries.
- **Our own PDF renderer in TypeScript.** Rejected: weeks of work, and still wrong for common PDFs
  (CFF/Type 1 fonts, JBIG2 scans, encryption, shadings).
- **Expo Go only (a WebView on iOS, the system viewer on Android).** Rejected: no in-app viewing on Android
  at all, and no control over the iOS UI.

## Verification (2026-10-29)

| Check | Result |
| --- | --- |
| `pnpm exec expo prebuild --platform android --no-install`, then `./gradlew :pdf-renderer:compileDebugKotlin` | Compiles. Autolinking lists `pdf-renderer (1.0.0)` |
| iOS build (`npx expo run:ios`) | **NOT VERIFIED**: this machine has no Xcode, only the Command Line Tools |
| In-app pages on a device or emulator | **NOT VERIFIED**: the emulator was running another app |
| Under the old bare `ios/` rule, `git check-ignore` reports the Swift source as ignored | Yes. Under the anchored rules it is kept, and `modules/pdf-renderer/android/build/` is ignored |
| Native files compared with the starter kit's (`diff -r`) | Identical |

Prebuild generates `android/` (gitignored) and adds `permissions` and `package` to `app.json`. That
`app.json` change was reverted: the repository stays on Expo Go and commits no generated projects.

### What to check on a device

With a development build (`pnpm exec expo run:android` / `run:ios`), on Settings → PDF viewer:

- [ ] The sample opens and shows its pages in the app, not in a "hand to another app" state.
- [ ] Zooming in sharpens the pages; each zoom level is drawn once (scroll back: no flicker).
- [ ] A password-protected PDF shows the password message; a non-PDF shows the unreadable message.
- [ ] A rotated (landscape) page appears the right way up and at the right proportions. This matters most
      on iOS, where `renderPage` concatenates `page.transform(for: .cropBox)` before `page.draw(with:to:)`.
- [ ] In Expo Go, the same screen still offers the system viewer.

## Porting to the starter kit (`apps/mobile`)

The starter kit already has the four native files (identical to these) and the anchored `.gitignore`. They
are uncommitted there (`git status`: `?? apps/mobile/modules/pdf-renderer/android/`, `.../ios/`, and
`M apps/mobile/.gitignore`). To bring the two repositories in line:

1. Confirm the module is the same: from the starter kit's root, run
   `diff -r -x build -x .gradle apps/mobile/modules/pdf-renderer <this repo>/modules/pdf-renderer`. It
   should print nothing.
2. Commit the four native files and `apps/mobile/.gitignore`.
3. Run `git ls-files apps/mobile/modules/pdf-renderer`. It should list five files: the config and the four
   native sources.

## Open question: a native-sources test

A Jest test could keep the Swift and Kotlin in step with `pdf-renderer-module.ts`, and fail if an ignore
rule hides them again. It would check that:

- the files exist and git does not ignore them;
- each registers `Name("PdfRenderer")`;
- each declares `openDocument` and `renderPage`;
- each uses every error code the JavaScript side knows.

It was written and passes, but it needs `node:fs`, `node:path` and `node:child_process`. Lint allows Node
built-ins only in `scripts/**` and `src/tokens/generator/__tests__/**`, and Jest finds tests only under
`src/`. Adding it therefore needs a maintainer to extend the Node override in `oxlint.config.mts`, for
example with `src/features/pdf-viewer/__tests__/pdf-renderer-native-sources.test.ts`. Until then it is
not part of the gate.

### `.gitignore` (this repository)

```gitignore
# Anchored to the app's root: a bare `ios/` would also hide the local Expo modules' own native sources
# (modules/pdf-renderer/ios and /android, ADR 056), leaving a development build without them.
/ios
/android
# Gradle's output inside a local module (its sources are committed).
modules/*/android/build/
modules/*/android/.gradle/
```
