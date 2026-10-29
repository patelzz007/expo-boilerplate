// The app drawer's menu (ADR 038), in display order: the five tabs first, then the account and
// preference screens that otherwise sit two taps deep under Settings, and the UI kit's Components
// gallery (Developer). Labels use the same words as the screens they open.

import BlocksIcon from "lucide-react-native/icons/blocks";
import FileTextIcon from "lucide-react-native/icons/file-text";
import ScanQrCodeIcon from "lucide-react-native/icons/scan-qr-code";
import PaletteIcon from "lucide-react-native/icons/palette";
import ShieldCheckIcon from "lucide-react-native/icons/shield-check";
import SmartphoneIcon from "lucide-react-native/icons/smartphone";

import type { DrawerSectionTone } from "../../components/drawer-menu";
import type { LucideIcon } from "@/ui/components/icon";
import { ROUTES, type AppRoute } from "../../runtime/routes";
import { PDF_VIEWER_TITLE } from "../pdf-viewer/labels";
import { QR_SCANNER_TITLE } from "../qr-scanner/labels";
import { APP_TABS, type AppTab } from "./app-tabs";
import { SCREEN_TITLES } from "./screen-titles";

export interface DrawerDestination {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly route: AppRoute;
  /** A tab is switched to; any other screen is pushed onto its tab's stack. */
  readonly isTab: boolean;
}

export interface DrawerDestinationGroup {
  /** Shown above the group, sentence case. */
  readonly title: string;
  /** The dot before the title. */
  readonly tone: DrawerSectionTone;
  readonly destinations: readonly DrawerDestination[];
}

/** The five tabs, shown at the top of the drawer. */
export const DRAWER_TABS: readonly DrawerDestination[] = APP_TABS.map((tab: AppTab): DrawerDestination => ({
  label: tab.title,
  icon: tab.icon,
  route: tab.route,
  isTab: true,
}));

/** The screens under Settings, grouped as on the Settings screen. */
export const DRAWER_GROUPS: readonly DrawerDestinationGroup[] = [
  {
    title: "Account",
    tone: "blue",
    destinations: [
      { label: SCREEN_TITLES.security, icon: ShieldCheckIcon, route: ROUTES.security, isTab: false },
      { label: SCREEN_TITLES.devices, icon: SmartphoneIcon, route: ROUTES.devices, isTab: false },
    ],
  },
  {
    title: "Preferences",
    tone: "purple",
    destinations: [{ label: SCREEN_TITLES.appearance, icon: PaletteIcon, route: ROUTES.appearance, isTab: false }],
  },
  {
    title: "Documents",
    tone: "blue",
    destinations: [
      { label: PDF_VIEWER_TITLE, icon: FileTextIcon, route: ROUTES.pdfViewer, isTab: false },
      { label: QR_SCANNER_TITLE, icon: ScanQrCodeIcon, route: ROUTES.qrScanner, isTab: false },
    ],
  },
];

/** The UI kit gallery: a developer tool, so the drawer lists it in development builds only. */
export const DEVELOPER_DRAWER_GROUP: DrawerDestinationGroup = {
  title: "Developer",
  tone: "amber",
  destinations: [{ label: SCREEN_TITLES.components, icon: BlocksIcon, route: ROUTES.components, isTab: false }],
};

/**
 * The drawer's sections: the fixed ones, and the Developer section in a development build only
 * (`__DEV__` is `false` in a store build, where the gallery's route redirects too).
 */
export function drawerGroups(): readonly DrawerDestinationGroup[] {
  return [...DRAWER_GROUPS, ...(__DEV__ ? [DEVELOPER_DRAWER_GROUP] : [])];
}

const TAB_ROUTES: ReadonlySet<string> = new Set(APP_TABS.map((tab: AppTab): string => tab.route));

/** The edge swipe opens the drawer only on a tab's first screen: deeper in, it means "back". */
export function isTabRoot(pathname: string): boolean {
  return TAB_ROUTES.has(pathname);
}
