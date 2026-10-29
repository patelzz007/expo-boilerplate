// What the app header calls each signed-in screen — one entry per route of the (app) group, in the
// screens' own words: the title, and the one line under it saying what the page is for. The header
// resolves both from the path the moment it changes, so the new title moves in step with the page
// instead of a frame after it.

import { ROUTES, type AppRoute } from "../../runtime/routes";
import { PDF_VIEWER_TITLE } from "../pdf-viewer/labels";
import { QR_SCANNER_TITLE } from "../qr-scanner/labels";
import { APP_TABS, type AppTab } from "./app-tabs";
import { SCREEN_TITLES } from "./screen-titles";

export interface ScreenHeading {
  readonly title: string;
  readonly subtitle: string;
}

/** Each tab's subtitle; the tab's title comes from APP_TABS. */
const TAB_SUBTITLES: Readonly<Record<AppTab["name"], string>> = {
  index: "Your account at a glance",
  analytics: "Your activity over time",
  search: "Find anything in the app",
  profile: "Your personal details",
  settings: "Manage your preferences and account",
};

const SUB_SCREEN_HEADINGS: readonly (readonly [AppRoute, ScreenHeading])[] = [
  [ROUTES.security, { title: SCREEN_TITLES.security, subtitle: "Your password and sign-in" }],
  [ROUTES.devices, { title: SCREEN_TITLES.devices, subtitle: "Where your account is signed in" }],
  [ROUTES.appearance, { title: SCREEN_TITLES.appearance, subtitle: "Choose how the app looks" }],
  [ROUTES.pdfViewer, { title: PDF_VIEWER_TITLE, subtitle: "Open and read PDF documents" }],
  [ROUTES.qrScanner, { title: QR_SCANNER_TITLE, subtitle: "Scan a code with your camera" }],
  [ROUTES.components, { title: SCREEN_TITLES.components, subtitle: "The UI kit, live" }],
];

const HEADINGS: ReadonlyMap<string, ScreenHeading> = new Map<string, ScreenHeading>([
  ...APP_TABS.map((tab: AppTab): [string, ScreenHeading] => [
    tab.route,
    { title: tab.title, subtitle: TAB_SUBTITLES[tab.name] },
  ]),
  ...SUB_SCREEN_HEADINGS,
]);

const NO_HEADING: ScreenHeading = { title: "", subtitle: "" };

/** The heading of the screen at `pathname`; empty for a path the app does not have. */
export function screenHeadingOf(pathname: string): ScreenHeading {
  return HEADINGS.get(pathname) ?? NO_HEADING;
}
