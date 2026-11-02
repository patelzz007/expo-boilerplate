// The inbox's sample data: the notices a typical person would have, built through the shared
// InAppNotificationResponseSchema so every row has exactly the shape the inbox renders. There is no
// backend: the list lives on this device, and reading or archiving a notice changes only this list.

import { type InAppNotificationResponse, InAppNotificationResponseSchema, type RichTextDocument } from "@/shared";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** A broadcast's full message, unfolded on demand in the inbox. */
const WEEKEND_MESSAGE: RichTextDocument = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Weekend specials" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Half price lattes " },
        { type: "text", text: "all Saturday", marks: [{ type: "bold" }] },
        { type: "text", text: ", at every store." },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Any size, hot or iced" }] }],
        },
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Show the code at the counter" }] }],
        },
      ],
    },
    { type: "codeBlock", content: [{ type: "text", text: "LATTE50" }] },
  ],
};

interface SampleNotice {
  readonly id: string;
  readonly typeKey: string;
  readonly category: InAppNotificationResponse["category"];
  readonly title: string;
  readonly body: string;
  readonly richBody: RichTextDocument | null;
  readonly senderName: string | null;
  readonly broadcastId: string | null;
  /** How long ago it arrived. */
  readonly agoMs: number;
  /** Read already (an older notice). */
  readonly read: boolean;
}

const SAMPLE_NOTICES: readonly SampleNotice[] = [
  {
    id: "0193f2c4-0000-7000-8000-0000000000a1",
    typeKey: "broadcasts.message",
    category: "MARKETING",
    title: "Weekend specials",
    body: "Half price lattes all Saturday, at every store.",
    richBody: WEEKEND_MESSAGE,
    senderName: "Kopi & Co",
    broadcastId: "0193f2c4-0000-7000-8000-0000000000b1",
    agoMs: 25 * MINUTE_MS,
    read: false,
  },
  {
    id: "0193f2c4-0000-7000-8000-0000000000a2",
    typeKey: "security.new-sign-in",
    category: "SECURITY",
    title: "New sign-in to your account",
    body: "Chrome on macOS signed in from Kuala Lumpur, Malaysia. If this wasn't you, change your password.",
    richBody: null,
    senderName: null,
    broadcastId: null,
    agoMs: 2 * HOUR_MS,
    read: false,
  },
  {
    id: "0193f2c4-0000-7000-8000-0000000000a3",
    typeKey: "notifications.test",
    category: "ACCOUNT",
    title: "Test notification",
    body: "Sent from the notification catalog.",
    richBody: null,
    senderName: null,
    broadcastId: null,
    agoMs: DAY_MS,
    read: true,
  },
  {
    id: "0193f2c4-0000-7000-8000-0000000000a4",
    typeKey: "security.password-changed",
    category: "SECURITY",
    title: "Your password was changed",
    body: "If you didn't change it, reset your password now.",
    richBody: null,
    senderName: null,
    broadcastId: null,
    agoMs: 3 * DAY_MS,
    read: true,
  },
];

/** The sample inbox at `nowMs`, newest first. */
export function sampleNotificationsAt(nowMs: number): readonly InAppNotificationResponse[] {
  return SAMPLE_NOTICES.map((notice: SampleNotice): InAppNotificationResponse =>
    InAppNotificationResponseSchema.parse({
      id: notice.id,
      typeKey: notice.typeKey,
      category: notice.category,
      surface: "CUSTOMER",
      title: notice.title,
      body: notice.body,
      richBody: notice.richBody,
      link: null,
      icon: null,
      senderName: notice.senderName,
      senderLogoUrl: null,
      groupCount: 1,
      broadcastId: notice.broadcastId,
      readAt: notice.read ? nowMs - notice.agoMs : null,
      archivedAt: null,
      createdAt: nowMs - notice.agoMs,
      updatedAt: nowMs - notice.agoMs,
      isDeleted: false,
      deletedAt: null,
    })
  );
}
