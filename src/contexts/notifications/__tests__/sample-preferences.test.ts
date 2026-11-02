import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPreferenceCell,
  NotificationPreferencesResponse,
} from "@/shared";

import { minuteToTime } from "../notification-settings-body";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  preferencesOf,
  SAMPLE_STORES,
  withDigest,
  withPlatformConsent,
  withQuietHours,
  withStoreConsent,
  withStoreLeft,
  withSwitch,
} from "../sample-preferences";

function cellOf(
  preferences: NotificationPreferencesResponse,
  category: NotificationCategory,
  channel: NotificationChannel
): NotificationPreferenceCell | undefined {
  return preferences.categories
    .find((row) => row.category === category)
    ?.channels.find((cell) => cell.channel === channel);
}

const [KOPI, BAKERI] = SAMPLE_STORES;
const KOPI_ID = KOPI?.id ?? "";
const BAKERI_ID = BAKERI?.id ?? "";

describe("preferencesOf", () => {
  it("builds every kind of message × channel, with security always on and SMS waiting for a verified phone", () => {
    const preferences = preferencesOf(DEFAULT_NOTIFICATION_SETTINGS);

    expect(preferences.categories.map((row) => row.category)).toEqual([
      "SECURITY",
      "ACCOUNT",
      "TRANSACTIONAL",
      "PRODUCT",
      "MARKETING",
    ]);
    expect(preferences.categories.every((row) => row.channels.length === 4)).toBe(true);
    expect(cellOf(preferences, "SECURITY", "EMAIL")).toMatchObject({ enabled: true, locked: true });
    expect(cellOf(preferences, "ACCOUNT", "SMS")).toMatchObject({ available: false, reason: "phone-unverified" });
    expect(cellOf(preferences, "TRANSACTIONAL", "EMAIL")).toMatchObject({ enabled: false, available: true });
  });

  it("keeps offers unavailable until the person agrees to news and offers, then on by default", () => {
    expect(cellOf(preferencesOf(DEFAULT_NOTIFICATION_SETTINGS), "MARKETING", "PUSH")).toMatchObject({
      available: false,
      reason: "needs-consent",
    });

    const consented = preferencesOf(withPlatformConsent(DEFAULT_NOTIFICATION_SETTINGS, true));
    expect(cellOf(consented, "MARKETING", "PUSH")).toMatchObject({ available: true, enabled: true, reason: null });
    expect(consented.platformMarketingConsent).toBe(true);
  });

  it("starts with quiet hours on 22:00–07:00, no digest, and offers from the first store only", () => {
    const preferences = preferencesOf(DEFAULT_NOTIFICATION_SETTINGS);

    expect(preferences.schedule).toMatchObject({
      quietHoursEnabled: true,
      quietStartMinute: 1320,
      quietEndMinute: 420,
      digestFrequency: "OFF",
    });
    expect(preferences.tenants).toEqual([
      { tenantId: KOPI_ID, tenantName: "Kopi & Co", marketingConsent: true, left: false },
      { tenantId: BAKERI_ID, tenantName: "Bakeri Mawar", marketingConsent: false, left: false },
    ]);
  });
});

describe("the choices", () => {
  it("keeps only the latest choice per switch", () => {
    const choices = withSwitch(
      withSwitch(DEFAULT_NOTIFICATION_SETTINGS, "PRODUCT", "PUSH", true),
      "PRODUCT",
      "PUSH",
      false
    );

    expect(choices.switches).toEqual([{ category: "PRODUCT", channel: "PUSH", enabled: false }]);
    expect(cellOf(preferencesOf(withSwitch(choices, "PRODUCT", "PUSH", true)), "PRODUCT", "PUSH")?.enabled).toBe(true);
  });

  it("sets quiet hours and the digest", () => {
    const preferences = preferencesOf(withDigest(withQuietHours(DEFAULT_NOTIFICATION_SETTINGS, false), "WEEKLY"));
    expect(preferences.schedule).toMatchObject({ quietHoursEnabled: false, digestFrequency: "WEEKLY" });
  });

  it("turns one store's offers on and off without touching the others", () => {
    const on = withStoreConsent(DEFAULT_NOTIFICATION_SETTINGS, BAKERI_ID, true);
    expect(on.storesWithOffers).toEqual([KOPI_ID, BAKERI_ID]);
    expect(withStoreConsent(on, KOPI_ID, false).storesWithOffers).toEqual([BAKERI_ID]);
  });

  it("leaving a store turns its offers off for good, once", () => {
    const left = withStoreLeft(withStoreLeft(DEFAULT_NOTIFICATION_SETTINGS, KOPI_ID), KOPI_ID);

    expect(left.storesLeft).toEqual([KOPI_ID]);
    expect(preferencesOf(withStoreConsent(left, KOPI_ID, true)).tenants.at(0)).toMatchObject({
      left: true,
      marketingConsent: false,
    });
  });
});

describe("the settings' small helpers", () => {
  it("writes a minute of the day as HH:mm", () => {
    expect(minuteToTime(0)).toBe("00:00");
    expect(minuteToTime(1320)).toBe("22:00");
    expect(minuteToTime(425)).toBe("07:05");
  });
});
