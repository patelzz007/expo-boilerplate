/// <reference types="node" />
// Runs on Node (the token generator and its checks), never in the app bundle.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

import { TOKEN_SOURCE } from "../../source";
import { GENERATED_FILE_PATHS } from "../generate";
import { renderLaunchColorsJson } from "../render-mobile-assets";

// app.json is static JSON, so it repeats the generated launch colours and asset paths. This keeps it in step
// with the token source: change a `splash` token, run `pnpm run tokens:generate`, then update app.json.

const SplashSchema = z.object({ image: z.string(), backgroundColor: z.string() });
const SplashPluginSchema = z.tuple([z.literal("expo-splash-screen"), SplashSchema.extend({ dark: SplashSchema })]);
const AppJsonSchema = z.object({
  expo: z.object({
    icon: z.string(),
    android: z.object({ adaptiveIcon: z.object({ foregroundImage: z.string(), backgroundColor: z.string() }) }),
    plugins: z.array(z.union([z.string(), z.tuple([z.string(), z.record(z.string(), z.json())])])),
  }),
});
const LaunchColorsSchema = z.object({ backgroundColor: z.string(), foregroundColor: z.string() });

/** Jest runs from the repository root (jest.config.js). */
const REPOSITORY_ROOT = process.cwd();

const { expo } = AppJsonSchema.parse(JSON.parse(readFileSync(join(REPOSITORY_ROOT, "app.json"), "utf8")));
const launchColors = LaunchColorsSchema.parse(JSON.parse(renderLaunchColorsJson(TOKEN_SOURCE)));
const splashPlugin = expo.plugins
  .map((plugin) => SplashPluginSchema.safeParse(plugin))
  .find((parsed) => parsed.success)?.data;
const [, splashOptions] = splashPlugin ?? [];

function asAppPath(path: string): string {
  return `./${path}`;
}

describe("app.json launch configuration", () => {
  it("uses the generated app icon for iOS and the Android adaptive icon, on the splash colour", () => {
    expect(expo.icon).toBe(asAppPath(GENERATED_FILE_PATHS["app-icon.png"]));
    expect(expo.android.adaptiveIcon).toStrictEqual({
      foregroundImage: asAppPath(GENERATED_FILE_PATHS["app-icon.png"]),
      backgroundColor: launchColors.backgroundColor,
    });
  });

  it("draws the generated splash mark on the generated splash colour, the same in light and dark", () => {
    expect(splashOptions).toBeDefined();
    expect(splashOptions).toMatchObject({
      image: asAppPath(GENERATED_FILE_PATHS["splash-icon.png"]),
      backgroundColor: launchColors.backgroundColor,
    });
    expect(splashOptions?.dark).toMatchObject({
      image: asAppPath(GENERATED_FILE_PATHS["splash-icon.png"]),
      backgroundColor: launchColors.backgroundColor,
    });
  });
});
