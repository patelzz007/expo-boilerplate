import { InAppNotificationResponseSchema } from "@/shared";

import { markedRead } from "../sample-inbox";
import { sampleNotificationsAt } from "../sample-notifications";

const NOW = 1_800_000_000_000;

describe("sampleNotificationsAt", () => {
  it("is a valid inbox page, newest first, with the two newest unread", () => {
    const notices = sampleNotificationsAt(NOW);

    expect(notices.every((notice) => InAppNotificationResponseSchema.safeParse(notice).success)).toBe(true);
    const times = notices.map((notice) => notice.createdAt);
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(notices.map((notice) => notice.readAt === null)).toEqual([true, true, false, false]);
  });

  it("has one broadcast, with a full message and a sender to report", () => {
    const broadcasts = sampleNotificationsAt(NOW).filter((notice) => notice.broadcastId !== null);

    expect(broadcasts).toHaveLength(1);
    expect(broadcasts.at(0)).toMatchObject({ senderName: "Kopi & Co", category: "MARKETING" });
    expect(broadcasts.at(0)?.richBody).not.toBeNull();
  });
});

describe("markedRead", () => {
  it("marks only the chosen unread notices, at the given time, and keeps older read times", () => {
    const notices = sampleNotificationsAt(NOW);
    const ids = new Set(notices.map((notice) => notice.id));
    const later = NOW + 1;

    const read = markedRead(notices, ids, later);

    expect(read.map((notice) => notice.readAt)).toEqual([later, later, notices.at(2)?.readAt, notices.at(3)?.readAt]);
    expect(markedRead(notices, new Set(), later)).toEqual(notices);
  });
});
