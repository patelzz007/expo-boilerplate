import { z } from "zod";

// ── Own profile (self-service) ─────────────────────────────────────────────

/** Shortest accepted full name — the same floor signup enforces. */
export const USER_FULL_NAME_MIN_LENGTH = 2;

/** Longest accepted full name — sizes the `users.full_name` column (`VarChar(100)`). */
export const USER_FULL_NAME_MAX_LENGTH = 100;

/** No ASCII/Unicode control characters (newlines, tabs, NUL …) inside a display name. */
const NO_CONTROL_CHARACTERS_PATTERN = /^[^\p{Cc}]*$/u;

/**
 * A person's display name: surrounding whitespace is trimmed, then it must be
 * {@link USER_FULL_NAME_MIN_LENGTH}–{@link USER_FULL_NAME_MAX_LENGTH} characters
 * with no control characters.
 */
export const UserFullNameSchema = z
  .string()
  .trim()
  .pipe(
    z
      .string()
      .min(USER_FULL_NAME_MIN_LENGTH, `Full name must be at least ${String(USER_FULL_NAME_MIN_LENGTH)} characters`)
      .max(USER_FULL_NAME_MAX_LENGTH, `Full name must be at most ${String(USER_FULL_NAME_MAX_LENGTH)} characters`)
      .regex(NO_CONTROL_CHARACTERS_PATTERN, "Full name cannot contain line breaks or other control characters")
  )
  .meta({ description: "The user's full name (trimmed)", example: "Jane Doe" });

/**
 * The fields a user may change on their own profile — one entry per editable
 * field. A form edits exactly these, and {@link UpdateOwnProfileSchema} is
 * derived from them, so adding a field here is the whole contract change.
 */
export const OwnProfileEditableFieldsSchema = z
  .object({
    fullName: UserFullNameSchema,
  })
  .strict();

export type OwnProfileEditableFields = z.output<typeof OwnProfileEditableFieldsSchema>;

/** The editable field names, from the schema itself. */
export const OWN_PROFILE_EDITABLE_FIELDS: readonly (keyof OwnProfileEditableFields)[] =
  OwnProfileEditableFieldsSchema.keyof().options;
