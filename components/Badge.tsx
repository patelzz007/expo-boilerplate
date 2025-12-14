import React from "react";
import { Text, View } from "react-native";
import { z } from "zod";

export type BadgeTone = "slate" | "blue" | "emerald" | "amber" | "rose";

const toneStyles: Record<BadgeTone, { bg: string; text: string }> = {
  slate: { bg: "bg-slate-100", text: "text-slate-800" },
  blue: { bg: "bg-blue-100", text: "text-blue-800" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-800" },
  amber: { bg: "bg-amber-100", text: "text-amber-900" },
  rose: { bg: "bg-rose-100", text: "text-rose-800" },
};

const badgePropsSchema = z.object({
  label: z.string().trim().min(1, "Badge label is required"),
  tone: z.enum(["slate", "blue", "emerald", "amber", "rose"]).default("slate"),
  pill: z.boolean().default(true),
});

type BadgeProps = z.infer<typeof badgePropsSchema>;

export function Badge(rawProps: BadgeProps) {
  const parsed = badgePropsSchema.safeParse(rawProps);
  if (!parsed.success) {
    console.warn("Badge validation failed", z.treeifyError(parsed.error));
    return null;
  }
  const { label, tone, pill } = parsed.data;
  const toneClass = toneStyles[tone];
  return (
    <View className={`inline-flex items-center ${pill ? "rounded-full" : "rounded-md"} px-2.5 py-1 ${toneClass.bg}`}>
      <Text className={`text-xs font-semibold ${toneClass.text}`}>{label}</Text>
    </View>
  );
}
