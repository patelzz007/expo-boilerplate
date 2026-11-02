import { z } from "zod";

import { BaseResponseSchema, EpochMsSchema } from "../../../schemas/api/common";
import { IanaTimeZoneSchema } from "../../reporting/schemas/analytics-time-zone";
import { RichTextDocumentResponseSchema } from "./rich-text";

// ── Notifications (ADR 070): one catalog, four channels ──────────────────────────────────────────

export const NotificationChannelSchema = z.enum(["IN_APP", "EMAIL", "PUSH", "SMS"]);
export type NotificationChannel = z.output<typeof NotificationChannelSchema>;

/**
 * What preferences act on. `SECURITY` is always sent in-app and by email; `OPERATIONS` (the platform's own
 * alerts, to the admin panel's people only) always in-app and to their phones.
 */
export const NotificationCategorySchema = z.enum([
  "SECURITY",
  "ACCOUNT",
  "TRANSACTIONAL",
  "PRODUCT",
  "MARKETING",
  "OPERATIONS",
]);
export type NotificationCategory = z.output<typeof NotificationCategorySchema>;

/** The audience side a notification belongs to; each app's bell shows only its own surface. */
export const NotificationSurfaceSchema = z.enum(["CUSTOMER", "MERCHANT", "ADMIN"]);
export type NotificationSurface = z.output<typeof NotificationSurfaceSchema>;

export const NotificationDigestFrequencySchema = z.enum(["OFF", "DAILY", "WEEKLY"]);
export type NotificationDigestFrequency = z.output<typeof NotificationDigestFrequencySchema>;

/** The wording version of the marketing-consent question a person answers (ADR 070). Bump it when the wording changes. */
export const MARKETING_CONSENT_WORDING_VERSION = "2026-10-30";

/** Minutes in a day: quiet hours are minutes after local midnight. */
export const MINUTES_PER_DAY = 1_440;
const LAST_MINUTE_OF_DAY = MINUTES_PER_DAY - 1;
export const MinuteOfDaySchema = z.number().int().min(0).max(LAST_MINUTE_OF_DAY);

// ── In-app inbox ─────────────────────────────────────────────────────────────────────────────────

export const InAppNotificationResponseSchema = BaseResponseSchema.extend({
  id: z.uuid(),
  typeKey: z.string(),
  category: NotificationCategorySchema,
  surface: NotificationSurfaceSchema,
  title: z.string(),
  body: z.string(),
  /** A broadcast's rich body (ADR 073); null for a catalog notification. */
  richBody: RichTextDocumentResponseSchema.nullable(),
  link: z.string().nullable(),
  icon: z.string().nullable(),
  senderName: z.string().nullable(),
  senderLogoUrl: z.string().nullable(),
  groupCount: z.number().int().positive(),
  broadcastId: z.uuid().nullable(),
  readAt: EpochMsSchema.nullable(),
  archivedAt: EpochMsSchema.nullable(),
});
export type InAppNotificationResponse = z.output<typeof InAppNotificationResponseSchema>;

// ── Preferences, quiet hours, digest ─────────────────────────────────────────────────────────────

/** Why a cell of the preference matrix cannot be changed or used. */
export const NotificationChannelUnavailableReasonSchema = z.enum([
  "mandatory",
  "phone-unverified",
  "no-push-device",
  "not-offered",
  "needs-consent",
]);
export type NotificationChannelUnavailableReason = z.output<typeof NotificationChannelUnavailableReasonSchema>;

export const NotificationPreferenceCellSchema = z.object({
  channel: NotificationChannelSchema,
  enabled: z.boolean(),
  /** Cannot be turned off (a mandatory channel). */
  locked: z.boolean(),
  /** The person can receive on it at all. */
  available: z.boolean(),
  reason: NotificationChannelUnavailableReasonSchema.nullable(),
});
export type NotificationPreferenceCell = z.output<typeof NotificationPreferenceCellSchema>;

/** One kind of message and its channels. */
export const NotificationPreferenceRowSchema = z.object({
  category: NotificationCategorySchema,
  channels: z.array(NotificationPreferenceCellSchema),
});
export type NotificationPreferenceRow = z.output<typeof NotificationPreferenceRowSchema>;

/**
 * The Android notification channel each kind of message is posted on. The phone app creates these
 * channels, so a person can tune each kind in the phone's own settings; the API names one per push.
 */
export const NOTIFICATION_PUSH_CHANNEL_IDS: Readonly<Record<NotificationCategory, string>> = {
  SECURITY: "notifications-security",
  ACCOUNT: "notifications-account",
  TRANSACTIONAL: "notifications-activity",
  PRODUCT: "notifications-product",
  MARKETING: "notifications-offers",
  OPERATIONS: "notifications-operations",
};

/** What a settings switch shows: on or off and changeable, kept on by a mandatory channel, or not available yet. */
export type NotificationPreferenceCellState = "on" | "off" | "locked" | "unavailable";

export function preferenceCellStateOf(cell: NotificationPreferenceCell): NotificationPreferenceCellState {
  if (cell.locked) {
    return "locked";
  }
  if (!cell.available) {
    return "unavailable";
  }
  return cell.enabled ? "on" : "off";
}

/** Whether the channel reaches the person now: kept on, or on and available. */
export function isPreferenceCellOn(cell: NotificationPreferenceCell): boolean {
  return cell.locked || (cell.enabled && cell.available);
}

/** The channels worth a switch: a kind of message never sent on a channel shows none for it. */
export function shownPreferenceCellsOf(row: NotificationPreferenceRow): readonly NotificationPreferenceCell[] {
  return row.channels.filter((cell): boolean => cell.reason !== "not-offered");
}

/** What a kind's own checkbox shows: every channel that can reach the person is on, some are, or none is. */
export type NotificationKindCheckState = "all" | "some" | "none";

/** A kind's checkbox over its channels that can reach the person (kept on, or available); one not available yet is left out. */
export function kindCheckStateOf(row: NotificationPreferenceRow): NotificationKindCheckState {
  const reachable = shownPreferenceCellsOf(row).filter((cell): boolean => cell.locked || cell.available);
  const onCount = reachable.filter(isPreferenceCellOn).length;
  if (onCount === 0) {
    return "none";
  }
  return onCount === reachable.length ? "all" : "some";
}

/** The channels a kind's checkbox changes: shown, available, not kept on, and not already `enabled`. */
export function kindChannelChangesOf(row: NotificationPreferenceRow, enabled: boolean): readonly NotificationChannel[] {
  return shownPreferenceCellsOf(row)
    .filter((cell): boolean => !cell.locked && cell.available && cell.enabled !== enabled)
    .map((cell): NotificationChannel => cell.channel);
}

/** Whether a kind's checkbox can change anything: at least one of its shown channels is available and not kept on. */
export function isKindSwitchable(row: NotificationPreferenceRow): boolean {
  return shownPreferenceCellsOf(row).some((cell): boolean => !cell.locked && cell.available);
}

const NOTIFICATION_SCHEDULE_SHAPE = {
  quietHoursEnabled: z.boolean(),
  quietStartMinute: MinuteOfDaySchema,
  quietEndMinute: MinuteOfDaySchema,
  timeZone: IanaTimeZoneSchema,
  digestFrequency: NotificationDigestFrequencySchema,
};

/** Quiet hours and the digest, as a client sets them (closed). */
export const NotificationScheduleSchema = z.object(NOTIFICATION_SCHEDULE_SHAPE).strict();
export type NotificationSchedule = z.output<typeof NotificationScheduleSchema>;

/** One tenant the person is a tenant customer of: consent and leave controls (ADR 073). */
export const NotificationTenantSettingSchema = z.object({
  tenantId: z.uuid(),
  tenantName: z.string(),
  marketingConsent: z.boolean(),
  left: z.boolean(),
});
export type NotificationTenantSetting = z.output<typeof NotificationTenantSettingSchema>;

export const NotificationPreferencesResponseSchema = z.object({
  /** `null` = platform-wide; a tenant id = that tenant's overrides. */
  tenantId: z.uuid().nullable(),
  categories: z.array(NotificationPreferenceRowSchema),
  platformMarketingConsent: z.boolean(),
  schedule: z.object(NOTIFICATION_SCHEDULE_SHAPE),
  tenants: z.array(NotificationTenantSettingSchema),
});
export type NotificationPreferencesResponse = z.output<typeof NotificationPreferencesResponseSchema>;
