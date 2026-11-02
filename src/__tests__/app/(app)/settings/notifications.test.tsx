import { QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";
import { act, fireEvent, renderRouter, screen, waitFor, within } from "expo-router/testing-library";
import * as React from "react";
import { View } from "react-native";

import { AppProviders, createTestRuntime } from "../../../../../test/app-harness";
import { memorySecureStore } from "../../../../../test/secure-store-memory";
import NotificationSettingsScreen from "../../../../app/(app)/settings/notification-settings";
import NotificationsScreen from "../../../../app/(app)/settings/notifications";
import { AppShell } from "../../../../features/app-shell/app-shell";
import { PreferencesStoreProvider } from "../../../../features/preferences/facade";
import { SessionStoreProvider } from "../../../../features/session/facade";
import { SampleInboxProvider } from "../../../../contexts/notifications";
import { NotificationSettingsChoicesSchema, SECURE_STORE_ENTRIES } from "../../../../lib/secure-store";
import { ReadyRuntimeProvider } from "../../../../runtime/runtime-context";

jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));

const SETTINGS_KEY = SECURE_STORE_ENTRIES.notificationSettings.key;

function InApp({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <AppProviders>
      <SampleInboxProvider>{children}</SampleInboxProvider>
    </AppProviders>
  );
}

function Inbox(): React.JSX.Element {
  return (
    <InApp>
      <NotificationsScreen />
    </InApp>
  );
}

function Settings(): React.JSX.Element {
  return (
    <InApp>
      <NotificationSettingsScreen />
    </InApp>
  );
}

async function openInbox(): Promise<void> {
  await renderRouter({ "(app)/settings/notifications": Inbox }, { initialUrl: "/settings/notifications" });
}

async function openSettings(): Promise<void> {
  await renderRouter(
    { "(app)/settings/notification-settings": Settings },
    { initialUrl: "/settings/notification-settings" }
  );
  await screen.findByText("What reaches you");
}

/** The choices saved on the phone, read the way the app reads them. */
function savedChoices(): ReturnType<typeof NotificationSettingsChoicesSchema.parse> {
  const raw = memorySecureStore.peek(SETTINGS_KEY);
  if (raw === null) {
    throw new Error("Nothing saved");
  }
  return NotificationSettingsChoicesSchema.parse(JSON.parse(raw));
}

async function chooseFromMenu(title: string, action: string): Promise<void> {
  await fireEvent.press(screen.getByRole("button", { name: `More options for ${title}` }));
  await fireEvent.press(await screen.findByRole("menuitem", { name: action }));
}

describe("Notifications — the inbox", () => {
  it("lists the sample notices as a feed: the last day under New, older ones under Earlier, unread ones marked", async () => {
    await openInbox();

    const fresh = within(screen.getByTestId("notifications-section-new"));
    expect(fresh.getByText("Weekend specials")).toBeOnTheScreen();
    expect(fresh.getByText("New sign-in to your account")).toBeOnTheScreen();
    const earlier = within(screen.getByTestId("notifications-section-earlier"));
    expect(earlier.getByText("Test notification")).toBeOnTheScreen();
    expect(earlier.getByText("Your password was changed")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Unread\. Weekend specials\. .*\. 25m$/u })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Your password was changed\./u })).toBeOnTheScreen();
  });

  it("reads a notice by opening it, and shows a broadcast's full message", async () => {
    await openInbox();

    await fireEvent.press(screen.getByRole("button", { name: /^Unread\. Weekend specials/u }));

    expect(await screen.findByText("Any size, hot or iced")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Weekend specials\./u })).toBeOnTheScreen();
  });

  it("marks a notice read from its menu, then all of them", async () => {
    await openInbox();

    await chooseFromMenu("New sign-in to your account", "Mark as read");
    expect(screen.getByRole("button", { name: /^New sign-in to your account\./u })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Mark all as read" }));
    expect(screen.queryByRole("button", { name: /^Unread\./u })).toBeNull();
    expect(screen.getByRole("button", { name: "Mark all as read" })).toBeDisabled();
  });

  it("reports a broadcast from its menu, and offers a report only on a broadcast", async () => {
    await openInbox();

    await chooseFromMenu("Weekend specials", "Report as spam");
    expect(await screen.findByText("Thanks. We'll look at it.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "More options for Test notification" }));
    expect(await screen.findByRole("menuitem", { name: "Remove this notification" })).toBeOnTheScreen();
    expect(screen.queryByRole("menuitem", { name: "Report as spam" })).toBeNull();
  });

  it("lists only the unread on the Unread chip", async () => {
    await openInbox();

    await fireEvent.press(screen.getByRole("radio", { name: "Unread" }));

    expect(screen.getByText("Weekend specials")).toBeOnTheScreen();
    expect(screen.queryByText("Test notification")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Mark all as read" }));
    expect(screen.getByText("No unread notifications. You're all caught up.")).toBeOnTheScreen();
  });

  it("removes notices until it is all caught up", async () => {
    await openInbox();

    for (const title of [
      "Weekend specials",
      "New sign-in to your account",
      "Test notification",
      "Your password was changed",
    ]) {
      await chooseFromMenu(title, "Remove this notification");
    }

    expect(screen.getByText("You're all caught up.")).toBeOnTheScreen();
    expect(await screen.findByText("Notification removed.")).toBeOnTheScreen();
  });

  it("opens the notification settings from the feed", async () => {
    await renderRouter(
      { "(app)/settings/notifications": Inbox, "(app)/settings/notification-settings": Settings },
      { initialUrl: "/settings/notifications" }
    );

    await fireEvent.press(screen.getByRole("button", { name: "Notification settings" }));

    expect(await screen.findByText("What reaches you")).toBeOnTheScreen();
  });
});

describe("Notifications — settings", () => {
  it("shows each kind of message as a checkbox with its channels hung under it", async () => {
    await openSettings();

    const security = screen.getByRole("checkbox", { name: "Security" });
    expect(security).toBeChecked();
    expect(security).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "Activity" })).toBePartiallyChecked();
    const offers = screen.getByRole("checkbox", { name: "Offers" });
    expect(offers).not.toBeChecked();
    expect(offers).toBeDisabled();

    const kept = screen.getByTestId("notification-channel-SECURITY-IN_APP");
    expect(kept).toBeChecked();
    expect(kept).toBeDisabled();
    expect(screen.getAllByText("Always on, to keep your account safe").length).toBeGreaterThan(0);
    expect(screen.getByTestId("notification-channel-SECURITY-PUSH")).toBeEnabled();
    expect(screen.queryByTestId("notification-channel-SECURITY-SMS")).toBeNull();
    expect(screen.queryByRole("switch", { name: "In app" })).toBeNull();
  });

  it("says what to do for a channel that is not available yet", async () => {
    await openSettings();

    expect(screen.getByTestId("notification-channel-ACCOUNT-SMS")).toBeDisabled();
    expect(screen.getByText("Add and verify your phone number first")).toBeOnTheScreen();
    expect(screen.getByRole("checkbox", { name: "Account" })).toBeChecked();
  });

  it("saves each channel on the phone at once, and keeps it for the next visit", async () => {
    await openSettings();

    await act(async (): Promise<void> => {
      await fireEvent.press(screen.getByTestId("notification-channel-TRANSACTIONAL-EMAIL"));
    });

    expect(await screen.findByText("Saved.")).toBeOnTheScreen();
    expect(savedChoices().switches).toEqual([{ category: "TRANSACTIONAL", channel: "EMAIL", enabled: true }]);

    await openSettings();
    expect(screen.getByTestId("notification-channel-TRANSACTIONAL-EMAIL")).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Activity" })).toBeChecked();
  });

  it("ticks every channel a kind can use at once, then unticks them, leaving the kept-on ones", async () => {
    await openSettings();
    const product = screen.getByRole("checkbox", { name: "Product news" });
    expect(product).toBePartiallyChecked();

    await act(async (): Promise<void> => {
      await fireEvent.press(product);
    });
    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "Product news" })).toBeChecked();
    });
    expect(savedChoices().switches).toEqual([
      { category: "PRODUCT", channel: "EMAIL", enabled: true },
      { category: "PRODUCT", channel: "PUSH", enabled: true },
    ]);

    await act(async (): Promise<void> => {
      await fireEvent.press(screen.getByRole("checkbox", { name: "Security" }));
    });
    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "Security" })).toBePartiallyChecked();
    });
    expect(screen.getByTestId("notification-channel-SECURITY-IN_APP")).toBeChecked();
    expect(screen.getByTestId("notification-channel-SECURITY-PUSH")).not.toBeChecked();
  });

  it("opens offers once the person agrees to news and offers", async () => {
    await openSettings();
    expect(screen.getByTestId("notification-channel-MARKETING-IN_APP")).toBeDisabled();
    expect(screen.getAllByText("Turn on offers from us or a store below first").length).toBeGreaterThan(0);

    await act(async (): Promise<void> => {
      await fireEvent.press(screen.getByRole("switch", { name: "News and offers from us" }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("notification-channel-MARKETING-IN_APP")).toBeEnabled();
    });
    expect(screen.getByRole("checkbox", { name: "Offers" })).toBeChecked();
    expect(savedChoices().platformMarketingConsent).toBe(true);
  });

  it("asks before leaving a store, then shows it as left", async () => {
    await openSettings();
    expect(screen.getByRole("switch", { name: "Kopi & Co" })).toBeChecked();

    const [leaveFirstStore] = screen.getAllByRole("button", { name: "Leave store" });
    if (leaveFirstStore === undefined) {
      throw new Error("No store to leave");
    }
    await fireEvent.press(leaveFirstStore);

    const dialog = within(await screen.findByTestId("leave-store-0193f2c4-0000-7000-8000-0000000000c1"));
    expect(dialog.getByText("Leave Kopi & Co?")).toBeOnTheScreen();
    expect(memorySecureStore.peek(SETTINGS_KEY)).toBeNull();

    await act(async (): Promise<void> => {
      await fireEvent.press(dialog.getByRole("button", { name: "Leave store" }));
    });

    expect(await screen.findByText("You left this store. Claim from it again to hear from it.")).toBeOnTheScreen();
    expect(screen.queryByRole("switch", { name: "Kopi & Co" })).toBeNull();
    expect(savedChoices().storesLeft).toEqual(["0193f2c4-0000-7000-8000-0000000000c1"]);
  });

  it("goes back to what is stored when the phone cannot save, and says so", async () => {
    await openSettings();
    memorySecureStore.setItemAsync.mockImplementationOnce(() => Promise.reject(new Error("Keychain locked")));

    await act(async (): Promise<void> => {
      await fireEvent.press(screen.getByRole("switch", { name: "Quiet hours" }));
    });

    expect(await screen.findByText("Not saved on this phone. Try again.")).toBeOnTheScreen();
    expect(screen.getByRole("switch", { name: "Quiet hours" })).toBeChecked();
  });
});

describe("Notifications — the header's bell", () => {
  function Home(): React.JSX.Element {
    return <View />;
  }

  const runtime = createTestRuntime();

  function Layout(): React.JSX.Element {
    return (
      <ReadyRuntimeProvider runtime={runtime}>
        <QueryClientProvider client={runtime.queryClient}>
          <SessionStoreProvider store={runtime.sessionStore}>
            <PreferencesStoreProvider store={runtime.preferencesStore}>
              <InApp>
                <AppShell>
                  <Slot />
                </AppShell>
              </InApp>
            </PreferencesStoreProvider>
          </SessionStoreProvider>
        </QueryClientProvider>
      </ReadyRuntimeProvider>
    );
  }

  async function openApp(): Promise<void> {
    await renderRouter(
      {
        "(app)/_layout": Layout,
        "(app)/index": Home,
        "(app)/settings/notifications": NotificationsScreen,
      },
      { initialUrl: "/" }
    );
  }

  it("shows the unread count and opens the inbox", async () => {
    await openApp();

    expect(screen.getByText("2", { includeHiddenElements: true })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Notifications, 2 unread" }));

    expect(await screen.findByText("Weekend specials")).toBeOnTheScreen();
  });

  it("drops the count the moment a notice is read, and shows none once all are", async () => {
    await openApp();
    await fireEvent.press(screen.getByRole("button", { name: "Notifications, 2 unread" }));

    await fireEvent.press(await screen.findByRole("button", { name: /^Unread\. New sign-in/u }));
    expect(screen.getByRole("button", { name: "Notifications, 1 unread" })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Mark all as read" }));
    expect(screen.getByRole("button", { name: "Notifications" })).toBeOnTheScreen();
    expect(screen.queryByTestId("app-header-notification-count", { includeHiddenElements: true })).toBeNull();
  });
});
