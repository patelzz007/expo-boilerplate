// ============================================
// demo-account-list.ts — the demo logins the sign-in screen offers in development
// ============================================
// NEVER import this file directly: only `loadDemoAccounts` (demo-accounts.ts) does, inside an
// `if (__DEV__)` branch, which Metro removes from a production bundle together with this module.

import type { DemoAccount } from "./demo-accounts";

/** The demo logins offered on the sign-in screen of a development build. */
export const MOBILE_DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { label: "Super Admin", fullName: "Sam Super", email: "superadmin@example.com", password: "SuperAdmin@123" },
  { label: "Admin", fullName: "Alex Admin", email: "admin@example.com", password: "Admin@123" },
  { label: "Manager", fullName: "Morgan Manager", email: "manager@example.com", password: "Manager@123" },
];
