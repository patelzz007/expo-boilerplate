// ============================================
// generator/generate.ts — the token source → every generated file (the stylesheet, the launch assets)
// ============================================
// Pure: returns file names and contents, writes nothing (scripts/generate-tokens.ts
// writes; the staleness test compares). Fails — throws — when the source does
// not parse (an unsupported value, a missing role, a palette step that does not
// exist), when a theme lacks a variable another theme defines, or when a block
// would declare a variable twice.

import type { GeneratedFileName, TokenSource } from "../schema";
import { TokenSourceSchema } from "../schema";
import { renderAppIcon, renderLaunchColorsJson, renderSplashIcon } from "./render-mobile-assets";
import { renderMobileStylesheet } from "./render-mobile";

export interface GeneratedStylesheet {
  readonly fileName: GeneratedFileName;
  /** Text for the stylesheet and the JSON; bytes for the raster icons. */
  readonly contents: string | Uint8Array;
}

/**
 * Where each generated file lives in this repository, relative to its root: the stylesheet
 * global.css imports, and the launch assets app.json points at.
 */
export const GENERATED_FILE_PATHS: Readonly<Record<GeneratedFileName, string>> = {
  "mobile.css": "src/styles/tokens.css",
  "app-icon.png": "assets/app-icon.png",
  "splash-icon.png": "assets/splash-icon.png",
  "launch-colors.json": "assets/launch-colors.json",
};

export function generateTokenStylesheets(input: TokenSource): readonly GeneratedStylesheet[] {
  const source = TokenSourceSchema.parse(input);
  return [
    { fileName: "mobile.css", contents: renderMobileStylesheet(source) },
    { fileName: "app-icon.png", contents: renderAppIcon(source) },
    { fileName: "splash-icon.png", contents: renderSplashIcon(source) },
    { fileName: "launch-colors.json", contents: renderLaunchColorsJson(source) },
  ];
}
