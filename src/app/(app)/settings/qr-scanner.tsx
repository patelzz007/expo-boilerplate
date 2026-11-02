// ============================================
// QR scanner — scan a QR code and see what it holds (features/qr-scanner)
// ============================================
// Two scanners, the person's choice: Google's code scanner (ML Kit; disabled on a phone without Google
// Play services, and in Expo Go) or the kit's own camera scanner, which has "Scan from gallery" inside
// it. Either opens full screen; the last code read is shown here, with Copy and — for an http(s) link
// only — Open link. "Scan from gallery" beside the buttons reads a photo straight away (Google's scanner
// draws its own screen, with no room for it). Nothing is sent anywhere.

import * as Clipboard from "expo-clipboard";
import CameraIcon from "lucide-react-native/icons/camera";
import CopyIcon from "lucide-react-native/icons/copy";
import ExternalLinkIcon from "lucide-react-native/icons/external-link";
import ScanQrCodeIcon from "lucide-react-native/icons/scan-qr-code";
import * as React from "react";
import { Linking, View } from "react-native";

import { Button } from "@/ui/components/button";
import { Card } from "@/ui/components/card";
import { deviceQrScannerEngine, QrScanFromGalleryButton, QrScanner } from "@/ui/components/qr-scanner";
import type { QrScannerEngine } from "@/ui/lib/qr-scanner-engine";
import { BodyText, MutedText } from "@/ui/components/text";

import { Screen } from "../../../components/screen";
import { QR_SCANNER_COPY } from "../../../features/qr-scanner/labels";
import { scannedTextOf, type ScannedText } from "../../../features/qr-scanner/scanned-text";
import { useToast } from "../../../features/toast/facade";

export default function QrScannerScreen(): React.JSX.Element {
  const toast = useToast();
  // Which scanner is open: Google's (ML Kit) or the kit's own camera scanner; null when neither.
  const [openScanner, setOpenScanner] = React.useState<QrScannerEngine | null>(null);
  // Google's scanner needs Play services; without it the button is disabled (decided once per screen).
  const [hasGoogleScanner] = React.useState((): boolean => deviceQrScannerEngine() === "google");
  const [scanned, setScanned] = React.useState<ScannedText | null>(null);

  const openGoogleScanner = React.useCallback((): void => {
    setOpenScanner("google");
  }, []);
  const openCameraScanner = React.useCallback((): void => {
    setOpenScanner("camera");
  }, []);
  const closeScanner = React.useCallback((): void => {
    setOpenScanner(null);
  }, []);
  const receiveScan = React.useCallback((data: string): void => {
    setOpenScanner(null);
    setScanned(scannedTextOf(data));
  }, []);

  const value = scanned === null ? null : scanned.kind === "link" ? scanned.url : scanned.text;
  const copy = React.useCallback((): void => {
    if (value === null) {
      return;
    }
    Clipboard.setStringAsync(value)
      .then((): void => {
        toast.success(QR_SCANNER_COPY.copied);
      })
      .catch((): void => {
        toast.error(QR_SCANNER_COPY.copyFailed);
      });
  }, [toast, value]);
  const openLink = React.useCallback((): void => {
    if (scanned?.kind !== "link") {
      return;
    }
    Linking.openURL(scanned.url).catch((): void => {
      toast.error(QR_SCANNER_COPY.openFailed);
    });
  }, [scanned, toast]);

  return (
    <Screen description={QR_SCANNER_COPY.description} testID="qr-scanner-screen">
      <Card title={QR_SCANNER_COPY.scanTitle} description={QR_SCANNER_COPY.scanDescription}>
        <View className="gap-2">
          <Button
            label={QR_SCANNER_COPY.scanWithGoogle}
            icon={ScanQrCodeIcon}
            onPress={openGoogleScanner}
            disabled={!hasGoogleScanner}
            testID="qr-scanner-open-google"
          />
          <Button
            label={QR_SCANNER_COPY.scanWithCamera}
            icon={CameraIcon}
            variant="secondary"
            onPress={openCameraScanner}
            testID="qr-scanner-open-camera"
          />
          <MutedText>
            {hasGoogleScanner ? QR_SCANNER_COPY.scanChoiceHint : QR_SCANNER_COPY.googleScannerUnavailable}
          </MutedText>
        </View>
        <QrScanFromGalleryButton onScan={receiveScan} testID="qr-scanner-gallery" />
      </Card>
      {scanned === null || value === null ? null : (
        <Card title={QR_SCANNER_COPY.resultTitle} testID="qr-scanner-result">
          <View className="gap-1">
            <MutedText>{scanned.kind === "link" ? QR_SCANNER_COPY.link : QR_SCANNER_COPY.text}</MutedText>
            <BodyText selectable testID="qr-scanner-value">
              {value}
            </BodyText>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label={QR_SCANNER_COPY.copy} icon={CopyIcon} variant="secondary" onPress={copy} />
            </View>
            {scanned.kind === "link" ? (
              <View className="flex-1">
                <Button label={QR_SCANNER_COPY.openLink} icon={ExternalLinkIcon} onPress={openLink} />
              </View>
            ) : null}
          </View>
        </Card>
      )}
      <QrScanner engine="google" visible={openScanner === "google"} onScan={receiveScan} onClose={closeScanner} />
      <QrScanner
        engine="camera"
        visible={openScanner === "camera"}
        onScan={receiveScan}
        onClose={closeScanner}
        testID="qr-scanner-camera"
      />
    </Screen>
  );
}
