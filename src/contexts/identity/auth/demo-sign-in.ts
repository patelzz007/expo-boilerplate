// The demo stand-in for the API's sign-in (UI only, no backend): a short pause so the screens show
// their pending state, then the session starts on this device.

/** How long a demo request "takes", so the buttons' loading state is visible. */
export const DEMO_REQUEST_DELAY_MS = 600;

/** Resolves after the demo request delay. */
export function simulateRequest(): Promise<void> {
  return new Promise((resolve: () => void): void => {
    setTimeout(resolve, DEMO_REQUEST_DELAY_MS);
  });
}

/** A display name for an email that came without one: the part before the `@`. */
export function fullNameFromEmail(email: string): string {
  const [localPart = email] = email.split("@");
  return localPart;
}
