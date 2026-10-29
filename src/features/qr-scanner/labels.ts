// Copy of the QR scanner screen (features/qr-scanner). The scanner's own words (its title, guidance,
// camera permission) are the kit's defaults (@/ui/components/qr-scanner).

export const QR_SCANNER_TITLE = "QR scanner";

export const QR_SCANNER_COPY = {
  description: "Scan a QR code with your camera and see what it holds.",
  scanTitle: "Scan a code",
  scanDescription: "Point your camera at any QR code: a link, a Wi-Fi network, a contact or plain text.",
  scan: "Scan a QR code",
  resultTitle: "Last scan",
  link: "A web link",
  text: "Text",
  copy: "Copy",
  copied: "Copied to the clipboard.",
  copyFailed: "That couldn't be copied. Try again.",
  openLink: "Open link",
  openFailed: "No app could open this link.",
  scanAgain: "Scan another",
} satisfies Record<string, string>;
