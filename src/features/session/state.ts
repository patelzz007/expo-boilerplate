import { z } from "zod";

/** Who is signed in: the demo session holds only what the screens show (no tokens, no API). */
export interface SessionUser {
  readonly fullName: string;
  readonly email: string;
}

/**
 * Why the device is signed out — the sign-in screen can explain it:
 * - `none`: never signed in on this run (the session is in memory only);
 * - `signedOut`: the user signed out.
 */
export const SignedOutReasonSchema = z.enum(["none", "signedOut"]);

export type SignedOutReason = z.output<typeof SignedOutReasonSchema>;

/** The session state machine of the root guard: signed out or signed in, nothing in between. */
export type SessionState =
  | { readonly status: "signedOut"; readonly reason: SignedOutReason }
  | { readonly status: "signedIn"; readonly user: SessionUser };

export const INITIAL_SESSION_STATE: SessionState = { status: "signedOut", reason: "none" };
