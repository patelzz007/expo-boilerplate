import { Ionicons } from "@expo/vector-icons";
import React, { ReactNode } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { z } from "zod";
import { Badge, type BadgeTone } from "./Badge";

const ionIconSchema = z.custom<keyof typeof Ionicons.glyphMap>(
  (name) => typeof name === "string" && Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, name),
  "Invalid Ionicon name"
);

const listItemPropsSchema = z.object({
  title: z.string().trim().min(1, "ListItem title is required"),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  icon: ionIconSchema.optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  badgeLabel: z.string().optional(),
  badgeTone: z.enum(["slate", "blue", "emerald", "amber", "rose"]).default("slate"),
  rightElement: z.custom<ReactNode>().optional(),
  onPress: z.custom<() => void>().optional(),
});

type ListItemProps = z.infer<typeof listItemPropsSchema>;

export function ListItem(rawProps: ListItemProps) {
  const parsed = listItemPropsSchema.safeParse(rawProps);
  if (!parsed.success) {
    console.warn("ListItem validation failed", z.treeifyError(parsed.error));
    return null;
  }
  const {
    title,
    subtitle,
    description,
    icon,
    avatarUrl,
    badgeLabel,
    badgeTone,
    rightElement,
    onPress,
  } = parsed.data;
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      className="flex-row items-center rounded-xl bg-white px-4 py-4 shadow-sm">
      <View className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-slate-900">
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} className="h-12 w-12 rounded-full" />
        ) : icon ? (
          <Ionicons name={icon} size={20} color="#ffffff" />
        ) : (
          <Text className="font-geistBold text-lg text-white">{title.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-semibold text-slate-900">{title}</Text>
          {badgeLabel ? <Badge label={badgeLabel} tone={badgeTone} pill={true} /> : null}
        </View>
        {subtitle ? <Text className="text-sm text-slate-600">{subtitle}</Text> : null}
        {description ? <Text className="text-xs text-slate-500">{description}</Text> : null}
      </View>
      {rightElement ?? <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />}
    </Container>
  );
}
