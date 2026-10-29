import { ForgotPasswordSchema, LoginSchema, SignupSchema } from "../auth";

const STRONG_PASSWORD = "StrongP@ss1";

describe("LoginSchema", () => {
  it("canonicalises the email and requires a password", () => {
    expect(LoginSchema.parse({ email: "Alice@Example.com", password: "x" })).toEqual({
      email: "alice@example.com",
      password: "x",
    });
    expect(LoginSchema.safeParse({ email: "alice@example.com", password: "" }).success).toBe(false);
  });

  it("rejects an invalid email and unknown keys", () => {
    expect(LoginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
    expect(LoginSchema.safeParse({ email: "alice@example.com", password: "x", remember: true }).success).toBe(false);
  });
});

describe("SignupSchema", () => {
  it("accepts a strong password and a full name of at least two characters", () => {
    expect(
      SignupSchema.safeParse({ email: "jane@example.com", password: STRONG_PASSWORD, fullName: "Jane Doe" }).success
    ).toBe(true);
    expect(
      SignupSchema.safeParse({ email: "jane@example.com", password: STRONG_PASSWORD, fullName: "J" }).success
    ).toBe(false);
  });

  it("rejects a weak password", () => {
    expect(
      SignupSchema.safeParse({ email: "jane@example.com", password: "weakpass", fullName: "Jane Doe" }).success
    ).toBe(false);
  });
});

describe("ForgotPasswordSchema", () => {
  it("takes one valid email", () => {
    expect(ForgotPasswordSchema.parse({ email: "JANE@example.com" })).toEqual({ email: "jane@example.com" });
    expect(ForgotPasswordSchema.safeParse({ email: "jane" }).success).toBe(false);
  });
});
