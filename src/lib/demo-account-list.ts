// ============================================
// demo-account-list.ts — the demo logins the sign-in screen offers
// ============================================
// The local demo session's accounts (the app is UI-only: they open nothing
// real). NEVER import this file directly: only `loadBundledDemoAccounts`
// (lib/env.ts) does, inside a branch Metro removes from a release bundle that
// was not built with `EXPO_PUBLIC_SHOW_DEMO_ACCOUNT=true` — together with this
// module, so these passwords never ship in a store build (ADR 042). It lives in
// lib/ because env.ts, the one file that may read the flag, imports it.

/** A one-tap demo login: the button's label, who it signs in as, and the credentials it fills in. */
export interface DemoAccount {
  readonly label: string;
  readonly fullName: string;
  readonly email: string;
  readonly password: string;
}

/** The demo logins offered on the sign-in screen (development, and release builds made with the flag). */
export const MOBILE_DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { label: "Super Admin", fullName: "Sam Super", email: "superadmin@example.com", password: "SuperAdmin@123" },
  { label: "Admin", fullName: "Alex Admin", email: "admin@example.com", password: "Admin@123" },
  { label: "Manager", fullName: "Morgan Manager", email: "manager@example.com", password: "Manager@123" },
];
