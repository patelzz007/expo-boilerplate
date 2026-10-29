// ============================================
// runtime/app-env.ts - Env building blocks for every app
// ============================================
// A subset of the starter kit's packages/shared/src/runtime/app-env.ts, verbatim: the URL schema the
// mobile app's environment check (src/lib/env.ts) builds on.

import { z } from "zod";

const HTTP_PROTOCOL_PATTERN = /^https?$/;
const TRAILING_SLASHES_PATTERN = /\/+$/;

/**
 * Absolute `http(s)://` URL. Trailing slashes are stripped so callers can
 * safely build `${url}/path` without producing `//path`.
 */
export const HttpUrlEnvSchema = z
  .url({ protocol: HTTP_PROTOCOL_PATTERN, error: "must be an absolute http:// or https:// URL" })
  .transform((value: string): string => value.replace(TRAILING_SLASHES_PATTERN, ""));
