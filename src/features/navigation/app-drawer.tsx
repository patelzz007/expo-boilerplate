// The app drawer (ADR 038): the (app) group's menu. Connects the presentational
// Drawer and drawer menu to the app — who is signed in, which screen is on
// show, the current appearance, where each destination goes, and signing out.
// Opened from the menu button in the corner of each tab's first screen, or by
// a swipe from the left edge there.

import { usePathname, useRouter } from "expo-router";
import LogOutIcon from "lucide-react-native/icons/log-out";
import * as React from "react";
import { ScrollView, Text, View } from "react-native";

import { Drawer } from "../../components/drawer";
import { DrawerAccountHeader, DrawerRow, DrawerSection } from "../../components/drawer-menu";
import { AlertDialog } from "@/ui/components/alert-dialog";
import { ROUTES, type AppRoute } from "../../runtime/routes";
import { useReadyRuntime } from "../../runtime/runtime-context";
import { useAppDrawerCommands, useAppDrawerOpen } from "../app-drawer/facade";
import { useThemePreference } from "../preferences/facade";
import { useSessionCommands, useSessionUser } from "../session/facade";
import { THEME_LABELS } from "../preferences/labels";
import {
  DRAWER_TABS,
  drawerGroups,
  isTabRoot,
  type DrawerDestination,
  type DrawerDestinationGroup,
} from "./drawer-destinations";

export interface AppDrawerProps {
  /** The tabs. */
  readonly children: React.ReactNode;
}

export function AppDrawer({ children }: AppDrawerProps): React.JSX.Element {
  const isOpen = useAppDrawerOpen();
  const drawer = useAppDrawerCommands();
  const pathname = usePathname();
  return (
    <Drawer
      open={isOpen}
      onOpen={drawer.opened}
      onClose={drawer.closed}
      swipeEnabled={isTabRoot(pathname)}
      accessibilityLabel="Menu"
      closeLabel="Close menu"
      panel={<AppDrawerPanel />}
      testID="app-drawer">
      {children}
    </Drawer>
  );
}

function AppDrawerPanel(): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const drawer = useAppDrawerCommands();
  const { appVersion, buildNumber } = useReadyRuntime();
  const theme = useThemePreference();
  const user = useSessionUser();
  const session = useSessionCommands();
  const [isConfirmingSignOut, setConfirmingSignOut] = React.useState(false);
  const askSignOut = React.useCallback((): void => {
    setConfirmingSignOut(true);
  }, []);
  const cancelSignOut = React.useCallback((): void => {
    setConfirmingSignOut(false);
  }, []);
  const confirmSignOut = React.useCallback((): void => {
    setConfirmingSignOut(false);
    drawer.closed();
    // The root guard then shows sign-in.
    session.signOut();
  }, [drawer, session]);

  /** Closes the drawer and goes there: a tab is switched to, any other screen pushed onto its tab's stack. */
  const goTo = React.useCallback(
    (route: AppRoute, isTab: boolean): void => {
      drawer.closed();
      if (route === pathname) {
        return;
      }
      if (isTab) {
        router.navigate(route);
      } else {
        // `withAnchor`: the tab's first screen (Settings) goes underneath, so "back" lands on it.
        router.push(route, { withAnchor: true });
      }
    },
    [drawer, pathname, router]
  );
  const open = React.useCallback(
    (destination: DrawerDestination): void => {
      goTo(destination.route, destination.isTab);
    },
    [goTo]
  );
  const openProfile = React.useCallback((): void => {
    goTo(ROUTES.profile, true);
  }, [goTo]);

  /** The current setting a row shows on its right. */
  const valueOf = React.useCallback(
    (route: AppRoute): string | undefined => (route === ROUTES.appearance ? THEME_LABELS[theme] : undefined),
    [theme]
  );
  const groups = drawerGroups();

  const version = buildNumber === null ? `Version ${appVersion}` : `Version ${appVersion} (${buildNumber})`;

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="gap-3 pb-6">
        {user === null ? null : (
          <View className="px-4 pt-4 pb-1">
            <DrawerAccountHeader
              name={user.fullName}
              email={user.email}
              imageUrl={null}
              action={{ label: "Edit profile", onPress: openProfile }}
              testID="app-drawer-account"
            />
          </View>
        )}
        <DrawerSection>
          {DRAWER_TABS.map((destination: DrawerDestination): React.JSX.Element => (
            <DestinationRow
              key={destination.route}
              destination={destination}
              value={undefined}
              selected={destination.route === pathname}
              onOpen={open}
            />
          ))}
        </DrawerSection>
        {groups.map((group: DrawerDestinationGroup): React.JSX.Element => (
          <DrawerSection key={group.title} heading={{ title: group.title, tone: group.tone }}>
            {group.destinations.map((destination: DrawerDestination): React.JSX.Element => (
              <DestinationRow
                key={destination.route}
                destination={destination}
                value={valueOf(destination.route)}
                selected={destination.route === pathname}
                onOpen={open}
              />
            ))}
          </DrawerSection>
        ))}
        <View className="border-t border-border pt-1">
          <DrawerRow
            icon={LogOutIcon}
            label="Sign out"
            tone="destructive"
            onPress={askSignOut}
            testID="app-drawer-sign-out"
          />
        </View>
        <Text className="px-6 pt-2 font-sans text-xs text-muted-foreground">{version}</Text>
      </ScrollView>
      <AlertDialog
        visible={isConfirmingSignOut}
        title="Sign out?"
        description="You'll need your password to sign in again on this device."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        onConfirm={confirmSignOut}
        onCancel={cancelSignOut}
        destructive
      />
    </View>
  );
}

interface DestinationProps {
  readonly destination: DrawerDestination;
  readonly selected: boolean;
  readonly onOpen: (destination: DrawerDestination) => void;
}

interface DestinationRowProps extends DestinationProps {
  readonly value: string | undefined;
}

function DestinationRow({ destination, value, selected, onOpen }: DestinationRowProps): React.JSX.Element {
  const press = React.useCallback((): void => {
    onOpen(destination);
  }, [destination, onOpen]);
  return (
    <DrawerRow
      icon={destination.icon}
      label={destination.label}
      selected={selected}
      onPress={press}
      {...(value === undefined ? {} : { value })}
    />
  );
}
