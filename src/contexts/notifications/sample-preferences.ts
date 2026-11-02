// The notification settings' sample model. The reference starter kit reads them from its API; here
// the matrix is built on the phone from a fixed catalog (what each kind of message can use) and the
// choices the person saved (lib/secure-store.ts, `notificationSettings`), through the shared
// NotificationPreferencesResponseSchema so the screen renders exactly the API's shape.

import {
  type NotificationCategory,
  type NotificationChannel,
  type NotificationChannelUnavailableReason,
  type NotificationDigestFrequency,
  type NotificationPreferenceCell,
  type NotificationPreferencesResponse,
  NotificationPreferencesResponseSchema,
} from "@/shared";

import type { NotificationSettingsChoices } from "../../lib/secure-store";

/** How a channel serves one kind of message before the person changes anything. */
type CatalogCell =
  | { readonly kind: "on" | "off" }
  /** Always on (security notices in the app and by email). */
  | { readonly kind: "locked" }
  /** Cannot be used here: the switch shows why. */
  | { readonly kind: "unavailable"; readonly reason: NotificationChannelUnavailableReason }
  /** Offers: usable only with the person's consent to news and offers. */
  | { readonly kind: "needs-consent" };

const ON: CatalogCell = { kind: "on" };
const OFF: CatalogCell = { kind: "off" };
const LOCKED: CatalogCell = { kind: "locked" };
const NEEDS_CONSENT: CatalogCell = { kind: "needs-consent" };
const NOT_OFFERED: CatalogCell = { kind: "unavailable", reason: "not-offered" };
const PHONE_UNVERIFIED: CatalogCell = { kind: "unavailable", reason: "phone-unverified" };

/** Each kind of message, and what each channel does for it. */
const CATALOG: readonly (readonly [NotificationCategory, Readonly<Record<NotificationChannel, CatalogCell>>])[] = [
  ["SECURITY", { IN_APP: LOCKED, EMAIL: LOCKED, PUSH: ON, SMS: NOT_OFFERED }],
  ["ACCOUNT", { IN_APP: ON, EMAIL: ON, PUSH: ON, SMS: PHONE_UNVERIFIED }],
  ["TRANSACTIONAL", { IN_APP: ON, EMAIL: OFF, PUSH: ON, SMS: NOT_OFFERED }],
  ["PRODUCT", { IN_APP: ON, EMAIL: OFF, PUSH: OFF, SMS: NOT_OFFERED }],
  ["MARKETING", { IN_APP: NEEDS_CONSENT, EMAIL: NEEDS_CONSENT, PUSH: NEEDS_CONSENT, SMS: NOT_OFFERED }],
];

const CHANNEL_ORDER: readonly NotificationChannel[] = ["IN_APP", "EMAIL", "PUSH", "SMS"];

/** The stores the sample person has claimed from (offers per store). */
export const SAMPLE_STORES: readonly { readonly id: string; readonly name: string }[] = [
  { id: "0193f2c4-0000-7000-8000-0000000000c1", name: "Kopi & Co" },
  { id: "0193f2c4-0000-7000-8000-0000000000c2", name: "Bakeri Mawar" },
];

const [FIRST_STORE] = SAMPLE_STORES;

/** Quiet hours of the sample schedule: 22:00 to 07:00. */
const QUIET_START_MINUTE = 22 * 60;
const QUIET_END_MINUTE = 7 * 60;
const SAMPLE_TIME_ZONE = "Asia/Kuala_Lumpur";

/** The settings before the person changes anything. */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsChoices = {
  switches: [],
  quietHoursEnabled: true,
  digestFrequency: "OFF",
  platformMarketingConsent: false,
  storesWithOffers: FIRST_STORE === undefined ? [] : [FIRST_STORE.id],
  storesLeft: [],
};

function cellOf(
  catalog: CatalogCell,
  channel: NotificationChannel,
  chosen: boolean | undefined,
  consent: boolean
): NotificationPreferenceCell {
  switch (catalog.kind) {
    case "locked":
      return { channel, enabled: true, locked: true, available: true, reason: "mandatory" };
    case "unavailable":
      return { channel, enabled: false, locked: false, available: false, reason: catalog.reason };
    case "needs-consent":
      return consent
        ? { channel, enabled: chosen ?? true, locked: false, available: true, reason: null }
        : { channel, enabled: false, locked: false, available: false, reason: "needs-consent" };
    case "on":
    case "off":
      return { channel, enabled: chosen ?? catalog.kind === "on", locked: false, available: true, reason: null };
  }
}

/** The settings screen's matrix, schedule and offers for the person's saved choices. */
export function preferencesOf(choices: NotificationSettingsChoices): NotificationPreferencesResponse {
  const chosenOf = (category: NotificationCategory, channel: NotificationChannel): boolean | undefined =>
    choices.switches.find((choice) => choice.category === category && choice.channel === channel)?.enabled;
  return NotificationPreferencesResponseSchema.parse({
    tenantId: null,
    categories: CATALOG.map(([category, channels]) => ({
      category,
      channels: CHANNEL_ORDER.map((channel: NotificationChannel): NotificationPreferenceCell =>
        cellOf(channels[channel], channel, chosenOf(category, channel), choices.platformMarketingConsent)
      ),
    })),
    platformMarketingConsent: choices.platformMarketingConsent,
    schedule: {
      quietHoursEnabled: choices.quietHoursEnabled,
      quietStartMinute: QUIET_START_MINUTE,
      quietEndMinute: QUIET_END_MINUTE,
      timeZone: SAMPLE_TIME_ZONE,
      digestFrequency: choices.digestFrequency,
    },
    tenants: SAMPLE_STORES.map((store) => ({
      tenantId: store.id,
      tenantName: store.name,
      marketingConsent: choices.storesWithOffers.includes(store.id) && !choices.storesLeft.includes(store.id),
      left: choices.storesLeft.includes(store.id),
    })),
  });
}

/** One switch turned on or off (the latest choice per switch is kept). */
export function withSwitch(
  choices: NotificationSettingsChoices,
  category: NotificationCategory,
  channel: NotificationChannel,
  enabled: boolean
): NotificationSettingsChoices {
  const others = choices.switches.filter((choice) => choice.category !== category || choice.channel !== channel);
  return { ...choices, switches: [...others, { category, channel, enabled }] };
}

export function withQuietHours(
  choices: NotificationSettingsChoices,
  quietHoursEnabled: boolean
): NotificationSettingsChoices {
  return { ...choices, quietHoursEnabled };
}

export function withDigest(
  choices: NotificationSettingsChoices,
  digestFrequency: NotificationDigestFrequency
): NotificationSettingsChoices {
  return { ...choices, digestFrequency };
}

export function withPlatformConsent(
  choices: NotificationSettingsChoices,
  granted: boolean
): NotificationSettingsChoices {
  return { ...choices, platformMarketingConsent: granted };
}

/** Offers from one store on or off. */
export function withStoreConsent(
  choices: NotificationSettingsChoices,
  storeId: string,
  granted: boolean
): NotificationSettingsChoices {
  const others = choices.storesWithOffers.filter((id) => id !== storeId);
  return { ...choices, storesWithOffers: granted ? [...others, storeId] : others };
}

/** Leaving a store also turns its offers off. */
export function withStoreLeft(choices: NotificationSettingsChoices, storeId: string): NotificationSettingsChoices {
  return {
    ...withStoreConsent(choices, storeId, false),
    storesLeft: choices.storesLeft.includes(storeId) ? choices.storesLeft : [...choices.storesLeft, storeId],
  };
}
