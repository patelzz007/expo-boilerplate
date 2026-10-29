// What a scanned QR code holds, as far as the screen cares: a web link it can open, or text it can
// only show and copy. A QR code is untrusted input (anyone can print one), so a link is parsed with a
// schema and only http(s) links are offered — never `javascript:`, `intent:` or a custom scheme.

import { z } from "zod";

const WebLinkSchema = z.url({ protocol: /^https?$/ });

export type ScannedText =
  | { readonly kind: "link"; readonly url: string }
  | { readonly kind: "text"; readonly text: string };

/** Classifies what the scanner read: an http(s) link to offer opening, otherwise plain text. */
export function scannedTextOf(data: string): ScannedText {
  const trimmed = data.trim();
  const link = WebLinkSchema.safeParse(trimmed);
  return link.success ? { kind: "link", url: link.data } : { kind: "text", text: data };
}
