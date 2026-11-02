// The app's inbox (the reference starter kit's ADR 070, the CUSTOMER surface), shown as a feed
// (notifications-feed.tsx): every notice or only the unread, newest first. With no backend the
// notices are the sample inbox on this phone (sample-inbox.tsx): reading and removing change it, and
// the header bell's count follows at once.

import type { BroadcastReportReason, InAppNotificationResponse } from "@/shared";
import { useRouter } from "expo-router";
import * as React from "react";

import { useToast } from "../../features/toast/facade";
import { ROUTES } from "../../runtime/routes";
import { isUnread, type InboxFilter } from "./feed-model";
import { NOTIFICATIONS_COPY } from "./labels";
import { NotificationsFeed, type NotificationsFeedState } from "./notifications-feed";
import { useSampleInbox } from "./sample-inbox";

/** The sample notices `filter` shows: all of them, or only the unread. */
export function filteredNotices(
  notifications: readonly InAppNotificationResponse[],
  filter: InboxFilter
): readonly InAppNotificationResponse[] {
  return filter === "unread" ? notifications.filter(isUnread) : notifications;
}

export function NotificationsInbox(): React.JSX.Element {
  const inbox = useSampleInbox();
  const toast = useToast();
  const router = useRouter();
  const [filter, setFilter] = React.useState<InboxFilter>("all");
  const { read, readAll, remove } = inbox;

  const handleRead = React.useCallback(
    (notification: InAppNotificationResponse): void => {
      read(notification.id);
    },
    [read]
  );
  const handleRemove = React.useCallback(
    (notification: InAppNotificationResponse): void => {
      remove(notification.id);
      toast.success(NOTIFICATIONS_COPY.removed);
    },
    [remove, toast]
  );
  const handleReport = React.useCallback(
    (notification: InAppNotificationResponse, _reason: BroadcastReportReason): void => {
      if (notification.broadcastId !== null) {
        toast.success(NOTIFICATIONS_COPY.reported);
      }
    },
    [toast]
  );
  const openSettings = React.useCallback((): void => {
    router.push(ROUTES.notificationSettings);
  }, [router]);
  // The sample inbox is one short page: nothing more to load, nothing to retry.
  const noMorePages = React.useCallback((): void => undefined, []);
  const state = React.useMemo(
    (): NotificationsFeedState => ({
      kind: "ready",
      notifications: filteredNotices(inbox.notifications, filter),
      hasMore: false,
    }),
    [filter, inbox.notifications]
  );

  return (
    <NotificationsFeed
      state={state}
      filter={filter}
      onFilterChange={setFilter}
      unreadCount={inbox.unreadCount}
      busy={false}
      loadingMore={false}
      onLoadMore={noMorePages}
      onRetry={noMorePages}
      onRead={handleRead}
      onReadAll={readAll}
      onRemove={handleRemove}
      onReport={handleReport}
      onOpenSettings={openSettings}
    />
  );
}
