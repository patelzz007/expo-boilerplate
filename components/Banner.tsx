import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { z } from "zod";

export type BannerTone = "info" | "success" | "warning" | "danger";

const toneStyles: Record<BannerTone, { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  info: { bg: "bg-blue-50", text: "text-blue-900", icon: "information-circle" },
  success: { bg: "bg-emerald-50", text: "text-emerald-900", icon: "checkmark-circle" },
  warning: { bg: "bg-amber-50", text: "text-amber-900", icon: "alert" },
  danger: { bg: "bg-rose-50", text: "text-rose-900", icon: "warning" },
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
  const toneClass = toneStyles[tone];
  return (
    <View className={`mb-4 flex-row items-start gap-3 rounded-xl px-4 py-3 ${toneClass.bg}`}>
      <Ionicons name={toneClass.icon} size={20} color="#0f172a" />
      <View className="flex-1">
        <Text className={`font-geistBold text-sm ${toneClass.text}`}>{title}</Text>
        {message ? <Text className={`text-sm ${toneClass.text} opacity-80`}>{message}</Text> : null}
      </View>
    </View>
  );
}
