// ============================================
// contexts/identity — the context's public surface
// ============================================
// Identity — signing in and out, devices (sessions) and the person's own profile.
// Code outside this folder (routes in src/app, runtime features, screen tests)
// imports from here, never from a file inside it.

export { type DemoAccount, useDemoAccounts } from "./auth/demo-accounts";
export { SignOutDialog } from "./auth/sign-out-dialog";
export { useSignOut } from "./auth/use-sign-out";
export { useSignOutConfirmation } from "./auth/use-sign-out-confirmation";
export { DEVICES_COPY } from "./devices/labels";
export { sampleSessionsAt } from "./devices/sample-sessions";
export { clientTypeLabelOf, platformLineOf, sessionDetailItems } from "./devices/session-details";
export { SignOutEverywhere } from "./devices/sign-out-everywhere";
export { DemoDatesSection } from "./profile/demo-dates-section";
