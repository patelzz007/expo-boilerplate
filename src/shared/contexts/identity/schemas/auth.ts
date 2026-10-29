import { z } from "zod";

import { canonicalEmailSchema } from "../../../schemas/api/email-address";
import { strongPassword } from "./password";

// ── Input Schemas ────────────────────────────────────────────────────────

export const LoginSchema = z
  .object({
    email: canonicalEmailSchema("Invalid email address").meta({
      description: "User email address",
      example: "admin@example.com",
    }),
    password: z.string().min(1, "Password is required").meta({
      description: "User password",
      example: "Admin@123",
    }),
  })
  .strict();

export type LoginInput = z.output<typeof LoginSchema>;

export const SignupSchema = z
  .object({
    email: canonicalEmailSchema("Invalid email address"),
    password: strongPassword.meta({
      description: "User password (must meet complexity requirements)",
      example: "StrongP@ss1",
    }),
    fullName: z.string().min(2, "Full name must be at least 2 characters").meta({
      description: "User's full name",
      example: "Jane Doe",
    }),
  })
  .strict();

export type SignupInput = z.output<typeof SignupSchema>;

export const ForgotPasswordSchema = z
  .object({
    email: canonicalEmailSchema("Invalid email address").meta({
      description: "The email address associated with the user account",
      example: "user@example.com",
    }),
  })
  .strict();

export type ForgotPasswordInput = z.output<typeof ForgotPasswordSchema>;

/**
 * Which app a request comes from (matches `X-Client-Type`): the three browser
 * apps (`web`, `admin`, `merchant`) and the Expo app (`mobile`). It selects how
 * tokens travel — httpOnly cookies for browsers, JSON bodies for `mobile`
 * (ADR 029) — and never grants or removes a permission.
 */
export const AuthClientTypeSchema = z.enum(["web", "admin", "merchant", "mobile"]);

export type AuthClientType = z.output<typeof AuthClientTypeSchema>;
