// The sample inbox on this phone (there is no backend): one list for the whole signed-in app, so the
// header bell's unread count and the inbox screen always agree — read a notice and the bell drops at
// once, the way the reference starter kit's live stream makes it. Provided by the app shell; reading
// and removing change only this list, until the app is opened again.

import { epochMs, type InAppNotificationResponse } from "@/shared";
import * as React from "react";

import { isUnread } from "./feed-model";
import { sampleNotificationsAt } from "./sample-notifications";

/** The notices with `ids` marked read at `nowMs` (already read ones keep their time). */
export function markedRead(
  notifications: readonly InAppNotificationResponse[],
  ids: ReadonlySet<string>,
  nowMs: number
): readonly InAppNotificationResponse[] {
  return notifications.map((notification): InAppNotificationResponse =>
    ids.has(notification.id) && notification.readAt === null
      ? { ...notification, readAt: epochMs(nowMs) }
      : notification
  );
}

export interface SampleInbox {
  /** Every notice still in the inbox, newest first. */
  readonly notifications: readonly InAppNotificationResponse[];
  readonly unreadCount: number;
  readonly read: (id: string) => void;
  readonly readAll: () => void;
  readonly remove: (id: string) => void;
}

const SampleInboxContext = React.createContext<SampleInbox | null>(null);

export class MissingSampleInboxError extends Error {
  public constructor() {
    super("useSampleInbox needs a <SampleInboxProvider> (the app shell renders one)");
    this.name = "MissingSampleInboxError";
  }
}

export function SampleInboxProvider({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  const [notifications, setNotifications] = React.useState<readonly InAppNotificationResponse[]>(
    (): readonly InAppNotificationResponse[] => sampleNotificationsAt(Date.now())
  );
  const read = React.useCallback((id: string): void => {
    setNotifications((current) => markedRead(current, new Set([id]), Date.now()));
  }, []);
  const readAll = React.useCallback((): void => {
    setNotifications((current) =>
      markedRead(current, new Set(current.map((notification) => notification.id)), Date.now())
    );
  }, []);
  const remove = React.useCallback((id: string): void => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);
  const inbox = React.useMemo(
    (): SampleInbox => ({ notifications, unreadCount: notifications.filter(isUnread).length, read, readAll, remove }),
    [notifications, read, readAll, remove]
  );
  return <SampleInboxContext.Provider value={inbox}>{children}</SampleInboxContext.Provider>;
}

export function useSampleInbox(): SampleInbox {
  const inbox = React.useContext(SampleInboxContext);
  if (inbox === null) {
    throw new MissingSampleInboxError();
  }
  return inbox;
}

/** How many sample notices are unread: the header bell's count. */
export function useUnreadNotifications(): number {
  return useSampleInbox().unreadCount;
}
