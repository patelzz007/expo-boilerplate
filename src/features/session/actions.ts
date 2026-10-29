import type { SessionUser } from "./state";

/** Everything that can happen to the session. */
export type SessionAction =
  | { readonly type: "[ Session ] Signed In"; readonly user: SessionUser }
  | { readonly type: "[ Session ] Signed Out" };

export const sessionActions = {
  signedIn: (user: SessionUser): SessionAction => ({ type: "[ Session ] Signed In", user }),
  signedOut: (): SessionAction => ({ type: "[ Session ] Signed Out" }),
};
