// ============================================
// Settings (§10.9) — appearance, security, devices, components, about, sign out
// ============================================

import Constants from "expo-constants";
import { useRouter } from "expo-router";
import * as React from "react";
import { View } from "react-native";

import { Button } from "@/ui/components/button";
import { Card } from "@/ui/components/card";
import { DetailList, type DetailItem } from "@/ui/components/detail-list";
import { ListRow } from "@/ui/components/list-row";
import { Screen } from "../../../components/screen";
import { SignOutDialog, useSignOut, useSignOutConfirmation } from "../../../contexts/identity";
import { PDF_VIEWER_TITLE } from "../../../features/pdf-viewer/labels";
import { QR_SCANNER_TITLE } from "../../../features/qr-scanner/labels";
import { usePreferencesCommands, useThemePreference } from "../../../features/preferences/facade";
import { THEME_LABELS } from "../../../features/preferences/labels";
import { ROUTES } from "../../../runtime/routes";

/** The app's own version (app.json), shown under About. */
const APP_VERSION = Constants.expoConfig?.version ?? "—";

export default function SettingsScreen(): React.JSX.Element {
  const router = useRouter();
  const theme = useThemePreference();
  const signOut = useSignOutConfirmation();
  const preferences = usePreferencesCommands();
  const { signOut: signOutNow } = useSignOut();

  const openAppearance = React.useCallback((): void => {
    router.push(ROUTES.appearance);
  }, [router]);
  const openSecurity = React.useCallback((): void => {
    router.push(ROUTES.security);
  }, [router]);
  const openDevices = React.useCallback((): void => {
    router.push(ROUTES.devices);
  }, [router]);
  const openPdfViewer = React.useCallback((): void => {
    router.push(ROUTES.pdfViewer);
  }, [router]);
  const openQrScanner = React.useCallback((): void => {
    router.push(ROUTES.qrScanner);
  }, [router]);
  const openComponents = React.useCallback((): void => {
    router.push(ROUTES.components);
  }, [router]);

  /** Development builds only: onboarding's "seen" flag lives in the Keychain, which outlives reinstalls (ADR 041). */
  const replayOnboarding = React.useCallback((): void => {
    preferences.onboardingReset();
    signOutNow().catch((error: unknown): void => {
      console.error("Signing out failed", error);
    });
  }, [preferences, signOutNow]);

  const about: readonly DetailItem[] = [{ label: "Version", value: APP_VERSION }];

  return (
    <Screen>
      <Card>
        <View>
          <ListRow label="Appearance" value={THEME_LABELS[theme]} onPress={openAppearance} />
          <ListRow label="Security" description="Password and signed-in devices" onPress={openSecurity} />
          <ListRow label="Signed-in devices" onPress={openDevices} />
        </View>
      </Card>
      <Card>
        <View>
          <ListRow label={PDF_VIEWER_TITLE} description="Read a PDF from your phone" onPress={openPdfViewer} />
          <ListRow label={QR_SCANNER_TITLE} description="Scan a QR code with your camera" onPress={openQrScanner} />
        </View>
      </Card>
      {/* The UI kit gallery is a development tool (settings/components.tsx). */}
      {__DEV__ ? (
        <Card>
          <ListRow label="Components" description="Every component in the UI kit, live" onPress={openComponents} />
        </Card>
      ) : null}
      <Card title="About">
        <DetailList items={about} />
        {__DEV__ ? (
          <Button
            label="Sign out and replay onboarding"
            variant="secondary"
            onPress={replayOnboarding}
            accessibilityHint="Development builds only: shows the first-launch walkthrough again"
          />
        ) : null}
      </Card>
      <Button label="Sign out" onPress={signOut.ask} />
      <SignOutDialog confirmation={signOut} />
    </Screen>
  );
}
