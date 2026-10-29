// ============================================
// app.config.ts - the app's identity and build-time switches, over app.json
// ============================================
// Read by the Expo CLI on the developer's machine (and by a native build), never
// bundled into the app. Expo reads app.json first and hands it in as `config`:
// app.json keeps the native configuration (plugins, splash, icon), and this file
// adds what comes from the environment, validated with zod, as the starter kit's
// app.config.ts does:
// - the app's identity: MOBILE_APP_NAME, MOBILE_APP_SLUG, MOBILE_BUNDLE_ID and
//   MOBILE_SCHEME, defaulting to app.json's values. Products built on the
//   boilerplate rename the app with these variables, never by editing a file.
// - EXPO_PUBLIC_ALLOW_LAN_HTTP_API: a LAN test APK's plain-http permission
//   (config-plugins/lan-http-api.ts), written into the generated manifest at
//   prebuild.
// A wrong value stops `expo start` / `expo export` / prebuild with the variable's name.

import type { ConfigContext, ExpoConfig } from "expo/config";
import { z } from "zod";

/** Longest display name the home screens of both platforms show without truncating. */
const APP_NAME_MAX_LENGTH = 30;

/** An Expo slug: lower-case letters, digits and dashes. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A bundle id valid on BOTH platforms: reverse-DNS segments of letters and
 * digits, each starting with a letter (Android package names forbid dashes,
 * iOS bundle ids forbid underscores — neither is allowed here).
 */
const BUNDLE_ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)+$/;

/** A URL scheme (RFC 3986): a letter, then letters, digits, `+`, `-` or `.`. */
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*$/;

/** app.json's identity: what the app is called when no MOBILE_* variable says otherwise. */
const DEFAULT_IDENTITY = {
  name: "hello-world",
  slug: "hello-world",
  bundleId: "com.bishen.helloworld",
  scheme: "hello-world",
};

const AppIdentityEnvSchema = z.object({
  MOBILE_APP_NAME: z.string().trim().min(1).max(APP_NAME_MAX_LENGTH).default(DEFAULT_IDENTITY.name),
  MOBILE_APP_SLUG: z
    .string()
    .regex(SLUG_PATTERN, "must be lower-case letters, digits and dashes")
    .default(DEFAULT_IDENTITY.slug),
  MOBILE_BUNDLE_ID: z
    .string()
    .regex(BUNDLE_ID_PATTERN, "must be reverse-DNS segments of letters and digits, e.g. com.example.app")
    .default(DEFAULT_IDENTITY.bundleId),
  MOBILE_SCHEME: z
    .string()
    .regex(SCHEME_PATTERN, "must be a URL scheme: a lower-case letter, then letters, digits, +, - or .")
    .default(DEFAULT_IDENTITY.scheme),
});

type AppIdentityEnv = z.output<typeof AppIdentityEnvSchema>;

/** A variable left empty in .env counts as unset, so the default applies. */
function valueOrUnset(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? undefined : trimmed;
}

function readAppIdentity(): AppIdentityEnv {
  const parsed = AppIdentityEnvSchema.safeParse({
    MOBILE_APP_NAME: valueOrUnset(process.env.MOBILE_APP_NAME),
    MOBILE_APP_SLUG: valueOrUnset(process.env.MOBILE_APP_SLUG),
    MOBILE_BUNDLE_ID: valueOrUnset(process.env.MOBILE_BUNDLE_ID),
    MOBILE_SCHEME: valueOrUnset(process.env.MOBILE_SCHEME),
  });
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue): string => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid mobile app identity (app.config.ts) — ${problems}`);
  }
  return parsed.data;
}

/**
 * `EXPO_PUBLIC_ALLOW_LAN_HTTP_API`: a test APK that talks to an API on the developer's machine over
 * the LAN in plain http (config-plugins/lan-http-api.ts, src/lib/env.ts). Read here because the
 * permission is written into the generated manifest at prebuild. `true`, `false` or unset.
 */
const LanHttpApiEnvSchema = z.object({ EXPO_PUBLIC_ALLOW_LAN_HTTP_API: z.enum(["true", "false"]).optional() });

function readLanHttpApiEnabled(): boolean {
  const parsed = LanHttpApiEnvSchema.safeParse({
    EXPO_PUBLIC_ALLOW_LAN_HTTP_API: valueOrUnset(process.env.EXPO_PUBLIC_ALLOW_LAN_HTTP_API),
  });
  if (!parsed.success) {
    throw new Error("Invalid EXPO_PUBLIC_ALLOW_LAN_HTTP_API (app.config.ts) — must be true or false, or left unset");
  }
  return parsed.data.EXPO_PUBLIC_ALLOW_LAN_HTTP_API === "true";
}

export default function appConfig({ config }: ConfigContext): ExpoConfig {
  const identity = readAppIdentity();
  const lanHttpApi = readLanHttpApiEnabled();
  return {
    ...config,
    name: identity.MOBILE_APP_NAME,
    slug: identity.MOBILE_APP_SLUG,
    scheme: identity.MOBILE_SCHEME,
    ios: { ...config.ios, bundleIdentifier: identity.MOBILE_BUNDLE_ID },
    android: { ...config.android, package: identity.MOBILE_BUNDLE_ID },
    plugins: [
      ...(config.plugins ?? []),
      // A LAN test APK only: plain http to the developer's machine (off, and https-only, in every other build).
      ["./config-plugins/lan-http-api.ts", { enabled: lanHttpApi }],
    ],
  };
}
