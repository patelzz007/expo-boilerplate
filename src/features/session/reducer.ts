import { assertNever } from "@/shared";

import type { SessionAction } from "./actions";
import type { SessionState } from "./state";

/** The root guard's transitions, pure. */
export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "[ Session ] Signed In":
      return { status: "signedIn", user: action.user };
    case "[ Session ] Signed Out":
      return state.status === "signedIn" ? { status: "signedOut", reason: "signedOut" } : state;
    default:
      return assertNever(action, "session action");
  }
}
