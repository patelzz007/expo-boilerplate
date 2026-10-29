// Every route of the app, by name — screens never hand-type a path (rules/00, "No magic").

export const ROUTES = {
  onboarding: "/onboarding",
  signIn: "/sign-in",
  signUp: "/sign-up",
  forgotPassword: "/forgot-password",
  home: "/",
  analytics: "/analytics",
  search: "/search",
  profile: "/profile",
  settings: "/settings",
  security: "/settings/security",
  devices: "/settings/devices",
  appearance: "/settings/appearance",
  /** Read a PDF: one the person picks, or `?url=&name=` pushed by another screen (features/pdf-viewer, ADR 056). */
  pdfViewer: "/settings/pdf-viewer",
  qrScanner: "/settings/qr-scanner",
  /** The UI kit's live gallery (src/ui), opened from the drawer's Developer section. */
  components: "/settings/components",
} satisfies Record<string, `/${string}`>;

/** Any one of the app's routes. */
export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
