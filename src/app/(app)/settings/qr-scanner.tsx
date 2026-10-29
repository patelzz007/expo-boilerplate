// ============================================
// QR scanner — scan a QR code and see what it holds (features/qr-scanner)
// ============================================
// The kit's QrScanner (Google's code scanner in an Android build, the camera everywhere else, Expo Go
// included) opens full screen; the last code read is shown here, with Copy and — for an http(s) link
// only — Open link. Nothing is sent anywhere.

import * as Clipboard from "expo-clipboard";
import CopyIcon from "lucide-react-native/icons/copy";
import ExternalLinkIcon from "lucide-react-native/icons/external-link";
import ScanQrCodeIcon from "lucide-react-native/icons/scan-qr-code";
import * as React from "react";
import { Linking, View } from "react-native";

import { Button } from "@/ui/components/button";
import { Card } from "@/ui/components/card";
import { QrScanner } from "@/ui/components/qr-scanner";
import { BodyText, MutedText } from "@/ui/components/text";

import { Screen } from "../../../components/screen";
import { QR_SCANNER_COPY } from "../../../features/qr-scanner/labels";
import { scannedTextOf, type ScannedText } from "../../../features/qr-scanner/scanned-text";
import { useToast } from "../../../features/toast/facade";

export default function QrScannerScreen(): React.JSX.Element {
  const toast = useToast();
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [scanned, setScanned] = React.useState<ScannedText | null>(null);

  const openScanner = React.useCallback((): void => {
    setScannerOpen(true);
  }, []);
  const closeScanner = React.useCallback((): void => {
    setScannerOpen(false);
  }, []);
  const receiveScan = React.useCallback((data: string): void => {
    setScannerOpen(false);
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
        <Button
          label={scanned === null ? QR_SCANNER_COPY.scan : QR_SCANNER_COPY.scanAgain}
          icon={ScanQrCodeIcon}
          onPress={openScanner}
          testID="qr-scanner-open"
        />
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
      <QrScanner visible={scannerOpen} onScan={receiveScan} onClose={closeScanner} testID="qr-scanner" />
    </Screen>
  );
}
