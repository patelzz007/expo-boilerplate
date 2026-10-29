import { HttpUrlEnvSchema } from "../app-env";

describe("HttpUrlEnvSchema", () => {
  it("accepts http and https URLs", () => {
    expect(HttpUrlEnvSchema.parse("http://localhost:8080")).toBe("http://localhost:8080");
    expect(HttpUrlEnvSchema.parse("https://api.example.com")).toBe("https://api.example.com");
  });

  it("strips trailing slashes so `${url}/path` never doubles the slash", () => {
    expect(HttpUrlEnvSchema.parse("https://app.example.com/")).toBe("https://app.example.com");
    expect(HttpUrlEnvSchema.parse("https://app.example.com/base//")).toBe("https://app.example.com/base");
  });

  it("rejects relative paths, bare hosts and non-http schemes", () => {
    expect(HttpUrlEnvSchema.safeParse("/api").success).toBe(false);
    expect(HttpUrlEnvSchema.safeParse("localhost:8080").success).toBe(false);
    expect(HttpUrlEnvSchema.safeParse("ftp://files.example.com").success).toBe(false);
    expect(HttpUrlEnvSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });
});
