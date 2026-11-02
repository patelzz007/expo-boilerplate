// Copy of the QR scanner screen (features/qr-scanner). The scanner's own words (its title, guidance,
// camera permission) are the kit's defaults (@/ui/components/qr-scanner).

export const QR_SCANNER_TITLE = "QR scanner";

export const QR_SCANNER_COPY = {
  description: "Scan a QR code with your camera and see what it holds.",
  scanTitle: "Scan a code",
  scanDescription: "Point your camera at any QR code: a link, a Wi-Fi network, a contact or plain text.",
  scanWithGoogle: "Scan with Google scanner",
  scanWithCamera: "Scan with this app's camera",
  scanChoiceHint: "Google's scanner (ML Kit) opens fastest. This app's camera can also read a code from a photo.",
  googleScannerUnavailable:
    "Google's scanner isn't available on this phone (it needs Google Play services). Use this app's camera.",
  resultTitle: "Last scan",
  link: "A web link",
  text: "Text",
  copy: "Copy",
  copied: "Copied to the clipboard.",
  copyFailed: "That couldn't be copied. Try again.",
  openLink: "Open link",
  openFailed: "No app could open this link.",
} satisfies Record<string, string>;
