import { Ionicons } from "@expo/vector-icons";
import React, { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { z } from "zod";

export type CardTone = "default" | "slate" | "blue" | "emerald" | "amber" | "rose";

type IconName = keyof typeof Ionicons.glyphMap;

const baseToneStyles: Record<CardTone, { iconBg: string; iconColor: string; border: string; valueText: string }> = {
  default: { iconBg: "bg-slate-900", iconColor: "#ffffff", border: "border-slate-100", valueText: "text-slate-900" },
  slate: { iconBg: "bg-slate-900", iconColor: "#ffffff", border: "border-slate-100", valueText: "text-slate-900" },
  blue: { iconBg: "bg-blue-600", iconColor: "#ffffff", border: "border-blue-100", valueText: "text-blue-900" },
  emerald: { iconBg: "bg-emerald-600", iconColor: "#ffffff", border: "border-emerald-100", valueText: "text-emerald-900" },
  amber: { iconBg: "bg-amber-500", iconColor: "#1f2937", border: "border-amber-100", valueText: "text-amber-900" },
  rose: { iconBg: "bg-rose-500", iconColor: "#1f2937", border: "border-rose-100", valueText: "text-rose-900" },
};

// Single card API
const cardIconSchema = z.custom<IconName>(
  (name) => typeof name === "string" && Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, name),
  "Invalid Ionicon name"
);

const cardPropsSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  icon: cardIconSchema.optional(),
  tone: z.enum(["default", "slate", "blue", "emerald", "amber", "rose"]).default("default"),
  children: z.custom<ReactNode>().optional(),
  footer: z.custom<ReactNode>().optional(),
  onPress: z.custom<() => void>().optional(),
});

type CardProps = z.infer<typeof cardPropsSchema>;

export function Card(rawProps: CardProps) {
  const parsed = cardPropsSchema.safeParse(rawProps);
  if (!parsed.success) {
    console.warn("Card validation failed", z.treeifyError(parsed.error));
    return null;
  }
  const { title, subtitle, icon, tone, children, footer, onPress } = parsed.data;
  const toneClass = baseToneStyles[tone];
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      activeOpacity={onPress ? 0.9 : 1}
      className={`mb-4 rounded-2xl border ${toneClass.border} bg-white p-5 shadow-sm`}>
      {(icon || title || subtitle) && (
        <View className="mb-4 flex-row items-center gap-3">
          {icon && (
            <View className={`h-10 w-10 items-center justify-center rounded-xl ${toneClass.iconBg}`}>
              <Ionicons name={icon} size={20} color={toneClass.iconColor} />
            </View>
          )}
          <View className="flex-1">
            {title && <Text className="font-geistBold text-lg text-slate-900">{title}</Text>}
            {subtitle && <Text className="text-sm text-slate-500">{subtitle}</Text>}
          </View>
        </View>
      )}
      {children}
      {footer ? <View className="mt-4 border-t border-slate-100 pt-3">{footer}</View> : null}
    </Container>
  );
}

// Data-driven stats grid API (previously in Cards.tsx)
const iconSchema = z.custom<IconName>(
  (name) => typeof name === "string" && Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, name),
  "Invalid Ionicon name"
);

const cardItemSchema = z.object({
  key: z.string(),
  title: z.string(),
  value: z.union([z.string(), z.number()]),
  subtitle: z.string().optional(),
  icon: iconSchema,
  tone: z.enum(["slate", "blue", "emerald", "amber", "rose"]).default("slate"),
});

export type CardItem = z.infer<typeof cardItemSchema>;

const cardsPropsSchema = z.object({
  items: z.array(cardItemSchema).min(1),
  columns: z.number().int().min(1).max(3).default(2),
});

export type CardsProps = z.infer<typeof cardsPropsSchema>;

const widthClassMap: Record<number, string> = {
  1: "w-full",
  2: "w-1/2",
  3: "w-1/3",
};

export function Cards(rawProps: CardsProps) {
  const { items, columns } = cardsPropsSchema.parse(rawProps);
  const widthClass = widthClassMap[columns] ?? widthClassMap[2];

  return (
    <View className="-mx-2 flex-row flex-wrap">
      {items.map((item) => {
        const tone = baseToneStyles[item.tone];
        return (
          <View key={item.key} className={`mb-4 px-2 ${widthClass}`}>
            <View className="rounded-2xl bg-white p-5 shadow-lg">
              <View className={`mb-4 h-10 w-10 items-center justify-center rounded-xl ${tone.iconBg}`}>
                <Ionicons name={item.icon} size={20} color={tone.iconColor} />
              </View>
              <Text className={`font-geistBold text-2xl ${tone.valueText}`}>{item.value}</Text>
              <Text className="mt-1 text-sm font-semibold text-slate-900">{item.title}</Text>
              {item.subtitle ? <Text className="mt-1 text-xs text-slate-500">{item.subtitle}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
