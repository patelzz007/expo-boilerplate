import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { z } from "zod";

const ionIconSchema = z.custom<keyof typeof Ionicons.glyphMap>(
  (name) => typeof name === "string" && Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, name),
  "Invalid Ionicon name"
);

const emptyStatePropsSchema = z.object({
  title: z.string().trim().min(1, "EmptyState title is required"),
  description: z.string().optional(),
  icon: ionIconSchema.default("information-circle-outline"),
  actionLabel: z.string().optional(),
  onAction: z.custom<() => void>().optional(),
});

type EmptyStateProps = z.infer<typeof emptyStatePropsSchema>;

export function EmptyState(rawProps: EmptyStateProps) {
  const parsed = emptyStatePropsSchema.safeParse(rawProps);
  if (!parsed.success) {
    console.warn("EmptyState validation failed", z.treeifyError(parsed.error));
    return null;
  }
  const { title, description, icon, actionLabel, onAction } = parsed.data;
  return (
    <View className="items-center justify-center rounded-2xl border border-slate-100 bg-white px-6 py-10 text-center">
      <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-slate-900">
        <Ionicons name={icon} size={24} color="#ffffff" />
      </View>
      <Text className="font-geistBold text-lg text-slate-900">{title}</Text>
      {description ? <Text className="mt-2 text-center text-sm text-slate-600">{description}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          className="mt-4 rounded-xl bg-slate-900 px-4 py-2"
          activeOpacity={0.9}>
          <Text className="text-sm font-semibold text-white">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
