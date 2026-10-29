// ============================================
// use-sign-out.ts - sign out and sign out everywhere
// ============================================
// The demo has no API: both end this device's session; the root guard then shows sign-in.

import * as React from "react";

import { useSessionCommands } from "../../../features/session/facade";
import { simulateRequest } from "./demo-sign-in";

export interface SignOutCommands {
  readonly signOut: () => Promise<void>;
  /** `true` when every session ended and this device left. */
  readonly signOutEverywhere: () => Promise<boolean>;
}

export function useSignOut(): SignOutCommands {
  const session = useSessionCommands();

  return React.useMemo((): SignOutCommands => {
    const leave = async (): Promise<void> => {
      await simulateRequest();
      session.signOut();
    };
    return {
      signOut: leave,
      signOutEverywhere: async (): Promise<boolean> => {
        await leave();
        return true;
      },
    };
  }, [session]);
}
