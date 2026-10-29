// ============================================
// error-messages.ts - what the user reads when something fails
// ============================================
// The app has no API: a failure carries its own message, or the generic one.

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

/** The message to show for a failure. */
export function errorMessageOf(error: Error | null): string {
  if (error === null || error.message.length === 0) {
    return GENERIC_ERROR_MESSAGE;
  }
  return error.message;
}
