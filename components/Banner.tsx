import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { z } from "zod";
import { useTheme } from "./ThemeProvider";

export type BannerTone = "info" | "success" | "warning" | "danger";

const toneStyles: Record<BannerTone, { bg: { light: string; dark: string }; text: { light: string; dark: string }; borderColor: { light: string; dark: string }; icon: keyof typeof Ionicons.glyphMap; iconColor: { light: string; dark: string } }> = {
  info: { 
    bg: { light: "#dbeafe", dark: "#0c4a6e" }, 
    text: { light: "#0c2340", dark: "#38bdf8" }, 
    borderColor: { light: "#7dd3fc", dark: "#0369a1" },
    icon: "information-circle",
    iconColor: { light: "#0369a1", dark: "#38bdf8" }
  },
  success: { 
    bg: { light: "#d1fae5", dark: "#064e3b" }, 
    text: { light: "#065f46", dark: "#6ee7b7" }, 
    borderColor: { light: "#6ee7b7", dark: "#047857" },
    icon: "checkmark-circle",
    iconColor: { light: "#047857", dark: "#6ee7b7" }
  },
  warning: { 
    bg: { light: "#fef3c7", dark: "#78350f" }, 
    text: { light: "#7c2d12", dark: "#fcd34d" }, 
    borderColor: { light: "#fcd34d", dark: "#b45309" },
    icon: "alert",
    iconColor: { light: "#b45309", dark: "#fcd34d" }
  },
  danger: { 
    bg: { light: "#fee2e2", dark: "#7f1d1d" }, 
    text: { light: "#991b1b", dark: "#fca5a5" }, 
    borderColor: { light: "#fca5a5", dark: "#dc2626" },
    icon: "warning",
    iconColor: { light: "#dc2626", dark: "#fca5a5" }
  },
};

const bannerPropsSchema = z.object({
  title: z.string().trim().min(1, "Banner title is required"),
  message: z.string().optional(),
  tone: z.enum(["info", "success", "warning", "danger"]).default("info"),
});

type BannerProps = z.infer<typeof bannerPropsSchema>;

export function Banner(rawProps: BannerProps) {
  const parsed = bannerPropsSchema.safeParse(rawProps);
  if (!parsed.success) {
    console.warn("Banner validation failed", z.treeifyError(parsed.error));
    return null;
  }
  const { title, message, tone } = parsed.data;
  const { tokens, colorScheme } = useTheme();
  const toneStyle = toneStyles[tone];
  const isDark = colorScheme === "dark";
  
  return (
    <View 
      className={`mb-4 flex-row items-start gap-3 rounded-xl border px-4 py-3`} 
      style={{ 
        backgroundColor: isDark ? toneStyle.bg.dark : toneStyle.bg.light, 
        borderColor: isDark ? toneStyle.borderColor.dark : toneStyle.borderColor.light
      }}>
      <Ionicons 
        name={toneStyle.icon} 
        size={20} 
        color={isDark ? toneStyle.iconColor.dark : toneStyle.iconColor.light} 
      />
      <View className="flex-1">
        <Text 
          className="text-sm font-semibold" 
          style={{ color: isDark ? toneStyle.text.dark : toneStyle.text.light }}>
          {title}
        </Text>
        {message ? (
          <Text 
            className="text-xs" 
            style={{ color: isDark ? toneStyle.text.dark : toneStyle.text.light, opacity: 0.8 }}>
            {message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
