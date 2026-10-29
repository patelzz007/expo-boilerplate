import { epochMs } from "../../../../schemas/api/common";
import {
  SessionDeviceNameSchema,
  sessionDisplayTextSchema,
  SessionLocationSchema,
  SessionSchema,
  SessionSignInMethodSchema,
  type Session,
} from "../device-session";

const SIGNED_IN_AT_MS = 1_790_000_000_000;
const SHORT_LIMIT = 5;

const session: Session = {
  id: "8f6f2d55-1c0f-4c3e-9b8e-6a1f2b3c4d5e",
  label: "Alex’s iPhone",
  isCurrent: true,
  clientType: "mobile",
  browserName: "CFNetwork",
  browserVersion: null,
  osName: "iOS",
  osVersion: "26.0",
  deviceType: "MOBILE",
  deviceModel: "iPhone 15 Pro",
  deviceName: "Alex’s iPhone",
  appVersion: "1.4.0",
  signInMethod: "PASSWORD_TOTP_NEW_DEVICE_CODE",
  ipAddress: "203.0.113.24",
  lastIpAddress: "198.51.100.7",
  location: null,
  createdAt: epochMs(SIGNED_IN_AT_MS),
  lastActiveAt: epochMs(SIGNED_IN_AT_MS),
  expiresAt: epochMs(SIGNED_IN_AT_MS),
};

describe("sessionDisplayTextSchema", () => {
  it("accepts text at the limit and rejects one character more", () => {
    const schema = sessionDisplayTextSchema(SHORT_LIMIT);
    expect(schema.parse("abcde")).toBe("abcde");
    expect(schema.safeParse("abcdef").success).toBe(false);
  });

  it("keeps emoji joiners (a device name may contain them)", () => {
    const family = "👨‍👩‍👧 iPad";
    expect(SessionDeviceNameSchema.parse(family)).toBe(family);
  });
});

describe("SessionSignInMethodSchema", () => {
  it("lists every sign-in flow, each with and without the new-device code", () => {
    expect(SessionSignInMethodSchema.options).toEqual([
      "PASSWORD",
      "PASSWORD_NEW_DEVICE_CODE",
      "PASSWORD_TOTP",
      "PASSWORD_TOTP_NEW_DEVICE_CODE",
      "PASSWORD_BACKUP_CODE",
      "PASSWORD_BACKUP_CODE_NEW_DEVICE_CODE",
      "TEAM_INVITE_REGISTRATION",
      "TEAM_INVITE_REGISTRATION_NEW_DEVICE_CODE",
    ]);
  });
});

describe("SessionLocationSchema", () => {
  it("requires an ISO 3166-1 alpha-2 country", () => {
    expect(SessionLocationSchema.parse({ country: "MY", region: "Selangor", city: null })).toEqual({
      country: "MY",
      region: "Selangor",
      city: null,
    });
    expect(SessionLocationSchema.safeParse({ country: "my", region: null, city: null }).success).toBe(false);
    expect(SessionLocationSchema.safeParse({ country: "MYS", region: null, city: null }).success).toBe(false);
  });
});

describe("SessionSchema", () => {
  it("parses a session and strips unknown keys", () => {
    expect(SessionSchema.parse({ ...session, token: "secret-hash" })).toEqual(session);
  });

  it("accepts the null details of a session stored before device details existed", () => {
    const legacy: Session = {
      ...session,
      isCurrent: false,
      clientType: null,
      browserName: null,
      osName: null,
      osVersion: null,
      deviceType: null,
      deviceModel: null,
      deviceName: null,
      appVersion: null,
      signInMethod: null,
      lastIpAddress: null,
    };
    expect(SessionSchema.parse(legacy)).toEqual(legacy);
  });
});
