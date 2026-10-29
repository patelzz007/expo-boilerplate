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

/**
 * Routes with a parameter in their path. They are pushed as `{ pathname, params }` (an href helper
 * beside the screen's feature), never navigated to as a bare path, so they stay out of `ROUTES`.
 */
export const DYNAMIC_ROUTES = {
  /** One team member, by their id: `router.push(teamMemberHref(id))` (features/sample-users). */
  teamMember: "/team/[id]",
} satisfies Record<string, `/${string}`>;

/** The paths DYNAMIC_ROUTES.teamMember resolves to ("/team/3"), for code that maps a path back to its screen. */
export const TEAM_MEMBER_PATH = /^\/team\/[^/]+$/;
