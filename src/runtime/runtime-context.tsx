// Hands the app runtime's services to the screens that need them.

import * as React from "react";

import type { ReadyAppRuntime } from "./app-runtime";

const ReadyRuntimeContext = React.createContext<ReadyAppRuntime | null>(null);
ReadyRuntimeContext.displayName = "AppRuntimeContext";

export interface ReadyRuntimeProviderProps {
  readonly runtime: ReadyAppRuntime;
  readonly children: React.ReactNode;
}

export function ReadyRuntimeProvider({ runtime, children }: ReadyRuntimeProviderProps): React.JSX.Element {
  return <ReadyRuntimeContext.Provider value={runtime}>{children}</ReadyRuntimeContext.Provider>;
}

/** Thrown when a screen needs the runtime outside the root providers — a wiring bug. */
export class MissingAppRuntimeError extends Error {
  public constructor() {
    super("The app runtime is missing — render inside the root layout's providers (src/app/_layout.tsx)");
    this.name = "MissingAppRuntimeError";
  }
}

export function useReadyRuntime(): ReadyAppRuntime {
  const runtime = React.useContext(ReadyRuntimeContext);
  if (runtime === null) {
    throw new MissingAppRuntimeError();
  }
  return runtime;
}
