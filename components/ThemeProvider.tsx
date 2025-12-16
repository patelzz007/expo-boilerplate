import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, ColorSchemeName } from "react-native";
import { z } from "zod";

/* =========================================================
 * Zod Schemas
 * ========================================================= */

const ThemeSchema = z.enum(["light", "dark", "system"]);
export type Theme = z.infer<typeof ThemeSchema>;

const ColorSchemeSchema = z.enum(["light", "dark"]);
export type AppColorScheme = z.infer<typeof ColorSchemeSchema>;

const TokensSchema = z.object({
  bg: z.string(),
  surface: z.string(),
  text: z.string(),
  textMuted: z.string(),
  border: z.string(),
  primary: z.string(),
  primaryTextOn: z.string(),
  accent: z.string(),
});

export type ThemeTokens = z.infer<typeof TokensSchema>;

const ThemeContextValueSchema = z.object({
  theme: ThemeSchema,
  colorScheme: ColorSchemeSchema,
  setTheme: z.function({
    input: z.tuple([ThemeSchema]),
    output: z.void(),
  }),
  tokens: TokensSchema,
});

export type ThemeContextValue = z.infer<typeof ThemeContextValueSchema>;

/* =========================================================
 * Context
 * ========================================================= */

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/* =========================================================
 * Helpers
 * ========================================================= */

function normalizeColorScheme(scheme: ColorSchemeName): AppColorScheme {
  return scheme === "dark" ? "dark" : "light";
}

function createTokens(colorScheme: AppColorScheme): ThemeTokens {
  const tokens =
    colorScheme === "dark"
      ? {
          bg: "#0b1220",
          surface: "#0f172a",
          text: "#e5e7eb",
          textMuted: "#94a3b8",
          border: "#1f2937",
          primary: "#1d4ed8",
          primaryTextOn: "#ffffff",
          accent: "#38bdf8",
        }
      : {
          bg: "#f8fafc",
          surface: "#ffffff",
          text: "#0f172a",
          textMuted: "#64748b",
          border: "#e2e8f0",
          primary: "#0f172a",
          primaryTextOn: "#ffffff",
          accent: "#2563eb",
        };

  // Runtime safety (dev & prod)
  return TokensSchema.parse(tokens);
}

/* =========================================================
 * Provider
 * ========================================================= */

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [systemScheme, setSystemScheme] = useState<AppColorScheme>(normalizeColorScheme(Appearance.getColorScheme()));

  // Listen to system theme changes
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(normalizeColorScheme(colorScheme));
    });

    return () => sub.remove();
  }, []);

  const colorScheme: AppColorScheme = theme === "system" ? systemScheme : theme;

  const tokens = useMemo(() => createTokens(colorScheme), [colorScheme]);

  const value = useMemo<ThemeContextValue>(() => {
    const ctx = {
      theme,
      colorScheme,
      setTheme,
      tokens,
    };

    // Optional but powerful: validate context shape
    return ThemeContextValueSchema.parse(ctx);
  }, [theme, colorScheme, tokens]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/* =========================================================
 * Hook
 * ========================================================= */

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
