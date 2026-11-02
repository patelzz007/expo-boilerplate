import { fireEvent, renderRouter, screen } from "expo-router/testing-library";
import * as React from "react";

import { AppProviders } from "../../../../../test/app-harness";
import * as mockExpoCamera from "../../../../../test/expo-camera-mock";
import { pickNext } from "../../../../../test/expo-image-picker-fake";
import QrScannerScreen from "../../../../app/(app)/settings/qr-scanner";

jest.mock("expo-camera", () => mockExpoCamera);
jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));

function ScannerScreenInApp(): React.JSX.Element {
  return (
    <AppProviders>
      <QrScannerScreen />
    </AppProviders>
  );
}

describe("QR scanner screen — the two scanners", () => {
  it("offers Google's scanner and the app's own camera, disabling Google's on a phone without Play services", async () => {
    await renderRouter({ "(app)/settings/qr-scanner": ScannerScreenInApp }, { initialUrl: "/settings/qr-scanner" });

    expect(screen.getByRole("button", { name: "Scan with Google scanner" })).toBeDisabled();
    expect(screen.getByText(/Google's scanner isn't available on this phone/u)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Scan with this app's camera" })).toBeEnabled();
  });

  it("opens the app's own camera scanner, with Scan from gallery inside it", async () => {
    await renderRouter({ "(app)/settings/qr-scanner": ScannerScreenInApp }, { initialUrl: "/settings/qr-scanner" });

    await fireEvent.press(screen.getByRole("button", { name: "Scan with this app's camera" }));

    expect(await screen.findByTestId("qr-scanner-camera-gallery")).toHaveAccessibleName("Scan from gallery");
  });
});

describe("QR scanner screen — scan from gallery", () => {
  it("reads the code in a photo picked from the gallery and shows it", async () => {
    mockExpoCamera.scanFromURLAsync.mockResolvedValueOnce([mockExpoCamera.scannedBarcode("https://example.com/menu")]);
    pickNext({
      uri: "file:///photos/qr.jpg",
      width: 640,
      height: 640,
      type: "image",
      fileName: "qr.jpg",
      fileSize: 1000,
      mimeType: "image/jpeg",
      assetId: null,
      base64: null,
      exif: null,
      duration: null,
    });
    await renderRouter({ "(app)/settings/qr-scanner": ScannerScreenInApp }, { initialUrl: "/settings/qr-scanner" });

    await fireEvent.press(screen.getByTestId("qr-scanner-gallery"));

    expect(await screen.findByTestId("qr-scanner-value")).toHaveTextContent("https://example.com/menu");
  });

  it("says when the photo holds no QR code", async () => {
    pickNext({
      uri: "file:///photos/cat.jpg",
      width: 640,
      height: 640,
      type: "image",
      fileName: "cat.jpg",
      fileSize: 1000,
      mimeType: "image/jpeg",
      assetId: null,
      base64: null,
      exif: null,
      duration: null,
    });
    await renderRouter({ "(app)/settings/qr-scanner": ScannerScreenInApp }, { initialUrl: "/settings/qr-scanner" });

    await fireEvent.press(screen.getByTestId("qr-scanner-gallery"));

    expect(await screen.findByText(/No QR code found in that photo/u)).toBeOnTheScreen();
  });
});
