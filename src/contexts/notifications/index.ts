// ============================================
// contexts/notifications — the context's public surface
// ============================================
// The app's notifications (the reference starter kit's ADR 070, 073): the inbox and its settings, on
// sample data kept on this phone. Code outside this folder imports from here, never from a file inside.

export { NOTIFICATION_SETTINGS_TITLE, NOTIFICATIONS_TITLE } from "./labels";
export { NotificationSettingsBody } from "./notification-settings-body";
export { NotificationsInbox } from "./notifications-inbox";
export { SampleInboxProvider, useUnreadNotifications } from "./sample-inbox";
