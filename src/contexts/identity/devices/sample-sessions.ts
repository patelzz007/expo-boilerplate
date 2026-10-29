// The "Signed-in devices" screen's sample data (§10.11): the devices a typical
// account would show, built through the shared SessionSchema so every row has
// exactly the shape the screen renders. There is no backend: the list lives on
// this device, and signing a device out removes it from the list.

import { type Session, SessionSchema } from "@/shared";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
/** How long a sample session stays signed in from its sign-in. */
const SESSION_LIFETIME_MS = 30 * DAY_MS;

interface SampleSessionTiming {
  /** How long ago the device signed in. */
  readonly signedInAgoMs: number;
  /** How long ago it was last active. */
  readonly lastActiveAgoMs: number;
}

interface SampleSessionDetails {
  readonly id: string;
  readonly label: string;
  readonly isCurrent: boolean;
  readonly clientType: "web" | "mobile";
  readonly browserName: string | null;
  readonly browserVersion: string | null;
  readonly osName: string;
  readonly osVersion: string;
  readonly deviceModel: string | null;
  readonly appVersion: string | null;
  readonly signInMethod: "PASSWORD" | "PASSWORD_TOTP" | "PASSWORD_NEW_DEVICE_CODE";
  readonly ipAddress: string;
  readonly location: { readonly country: string; readonly region: string | null; readonly city: string | null };
  readonly timing: SampleSessionTiming;
}

const SAMPLE_SESSION_DETAILS: readonly SampleSessionDetails[] = [
  {
    id: "sample-session-this-phone",
    label: "iPhone 15 Pro",
    isCurrent: true,
    clientType: "mobile",
    browserName: null,
    browserVersion: null,
    osName: "iOS",
    osVersion: "19.1",
    deviceModel: "iPhone 15 Pro",
    appVersion: "1.0.0",
    signInMethod: "PASSWORD",
    ipAddress: "203.0.113.24",
    location: { country: "MY", region: "Selangor", city: "Petaling Jaya" },
    timing: { signedInAgoMs: 2 * DAY_MS, lastActiveAgoMs: MINUTE_MS },
  },
  {
    id: "sample-session-laptop",
    label: "Chrome 141 on macOS",
    isCurrent: false,
    clientType: "web",
    browserName: "Chrome",
    browserVersion: "141.0.0.0",
    osName: "macOS",
    osVersion: "16.1",
    deviceModel: null,
    appVersion: null,
    signInMethod: "PASSWORD_TOTP",
    ipAddress: "198.51.100.7",
    location: { country: "MY", region: "Kuala Lumpur", city: "Kuala Lumpur" },
    timing: { signedInAgoMs: 9 * DAY_MS, lastActiveAgoMs: 3 * HOUR_MS },
  },
  {
    id: "sample-session-tablet",
    label: "Pixel Tablet",
    isCurrent: false,
    clientType: "mobile",
    browserName: null,
    browserVersion: null,
    osName: "Android",
    osVersion: "16",
    deviceModel: "Pixel Tablet",
    appVersion: "1.0.0",
    signInMethod: "PASSWORD_NEW_DEVICE_CODE",
    ipAddress: "192.0.2.51",
    location: { country: "SG", region: null, city: "Singapore" },
    timing: { signedInAgoMs: 21 * DAY_MS, lastActiveAgoMs: 4 * DAY_MS },
  },
];

function toSession(details: SampleSessionDetails, nowMs: number): Session {
  const createdAt = nowMs - details.timing.signedInAgoMs;
  return SessionSchema.parse({
    id: details.id,
    label: details.label,
    isCurrent: details.isCurrent,
    clientType: details.clientType,
    browserName: details.browserName,
    browserVersion: details.browserVersion,
    osName: details.osName,
    osVersion: details.osVersion,
    deviceType: null,
    deviceModel: details.deviceModel,
    deviceName: null,
    appVersion: details.appVersion,
    signInMethod: details.signInMethod,
    ipAddress: details.ipAddress,
    lastIpAddress: details.ipAddress,
    location: details.location,
    createdAt,
    lastActiveAt: nowMs - details.timing.lastActiveAgoMs,
    expiresAt: createdAt + SESSION_LIFETIME_MS,
  });
}

/** The sample devices as of `nowMs`, most recently active first (this phone first). */
export function sampleSessionsAt(nowMs: number): readonly Session[] {
  return SAMPLE_SESSION_DETAILS.map((details: SampleSessionDetails): Session => toSession(details, nowMs));
}
