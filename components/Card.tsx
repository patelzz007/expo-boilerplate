import { Ionicons } from "@expo/vector-icons";
import React, { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { z, treeifyError } from "zod";
import { useTheme } from "./ThemeProvider";

export type CardTone = "default" | "slate" | "blue" | "emerald" | "amber" | "rose";

type IconName = keyof typeof Ionicons.glyphMap;

const baseToneStyles: Record<
  CardTone,
  {
    iconBg: { light: string; dark: string };
    iconColor: { light: string; dark: string };
    valueText: { light: string; dark: string };
    cardBg: { light: string; dark: string };
  }
> = {
  default: {
    iconBg: { light: "#1e293b", dark: "#e2e8f0" },
    iconColor: { light: "#ffffff", dark: "#000000" },
    valueText: { light: "#0f172a", dark: "#e5e7eb" },
    cardBg: { light: "#ffffff", dark: "#0f172a" },
  },
  slate: {
    iconBg: { light: "#1e293b", dark: "#e2e8f0" },
    iconColor: { light: "#ffffff", dark: "#000000" },
    valueText: { light: "#0f172a", dark: "#e5e7eb" },
    cardBg: { light: "#f8fafc", dark: "#1e293b" },
  },
  blue: {
    iconBg: { light: "#1d4ed8", dark: "#2563eb" },
    iconColor: { light: "#ffffff", dark: "#ffffff" },
    valueText: { light: "#1e40af", dark: "#93c5fd" },
    cardBg: { light: "#dbeafe", dark: "#1e3a8a" },
  },
  emerald: {
    iconBg: { light: "#059669", dark: "#10b981" },
    iconColor: { light: "#ffffff", dark: "#ffffff" },
    valueText: { light: "#065f46", dark: "#6ee7b7" },
    cardBg: { light: "#d1fae5", dark: "#064e3b" },
  },
  amber: {
    iconBg: { light: "#f59e0b", dark: "#fbbf24" },
    iconColor: { light: "#ffffff", dark: "#000000" },
    valueText: { light: "#92400e", dark: "#fcd34d" },
    cardBg: { light: "#fef3c7", dark: "#78350f" },
  },
  rose: {
    iconBg: { light: "#e11d48", dark: "#f43f5e" },
    iconColor: { light: "#ffffff", dark: "#ffffff" },
    valueText: { light: "#831843", dark: "#fb7185" },
    cardBg: { light: "#ffe4e6", dark: "#881337" },
  },
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
    console.warn("Card validation failed", treeifyError(parsed.error));
    return null;
  }
  const { title, subtitle, icon, tone, children, footer, onPress } = parsed.data;
  const { tokens, colorScheme } = useTheme();
  const toneStyle = baseToneStyles[tone];
  const isDark = colorScheme === "dark";
  const Container = onPress ? TouchableOpacity : View;

  // Debug logging
  const bgColor = isDark ? toneStyle.iconBg.dark : toneStyle.iconBg.light;
  const cardBgColor = isDark ? toneStyle.cardBg.dark : toneStyle.cardBg.light;
  console.log("Card render:", { title, tone, isDark, bgColor, cardBgColor });

  return (
    <Container
      onPress={onPress}
      activeOpacity={onPress ? 0.9 : 1}
      className={`mb-4 rounded-2xl border p-5 shadow-sm`}
      style={{ backgroundColor: cardBgColor, borderColor: tokens.border }}>
      {(icon || title || subtitle) && (
        <View className="mb-4 flex-row items-center gap-3">
          {icon && (
            <View
              style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 12,
                backgroundColor: bgColor,
                alignItems: 'center',
                justifyContent: 'center'
              }}>
              <Ionicons name={icon} size={20} color={isDark ? toneStyle.iconColor.dark : toneStyle.iconColor.light} />
            </View>
          )}
          <View className="flex-1">
            {title && (
              <Text className="font-geistBold text-lg" style={{ color: tokens.text }}>
                {title}
              </Text>
            )}
            {subtitle && (
              <Text className="text-sm" style={{ color: tokens.textMuted }}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
      )}
      {children}
      {footer ? (
        <View className="mt-4 border-t pt-3" style={{ borderColor: tokens.border }}>
          {footer}
        </View>
      ) : null}
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
  const { tokens, colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const widthClass = widthClassMap[columns] ?? widthClassMap[2];

  return (
    <View className="-mx-2 flex-row flex-wrap">
      {items.map((item) => {
        const tone = baseToneStyles[item.tone];
        return (
          <View key={item.key} className={`mb-4 px-2 ${widthClass}`}>
            <View className="rounded-2xl p-5 shadow-lg" style={{ backgroundColor: tokens.surface }}>
              <View
                style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 12,
                  backgroundColor: isDark ? tone.iconBg.dark : tone.iconBg.light,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16
                }}>
                <Ionicons name={item.icon} size={20} color={isDark ? tone.iconColor.dark : tone.iconColor.light} />
              </View>
              <Text
                className={`font-geistBold text-2xl`}
                style={{ color: isDark ? tone.valueText.dark : tone.valueText.light }}>
                {item.value}
              </Text>
              <Text className="mt-1 text-sm font-semibold" style={{ color: tokens.text }}>
                {item.title}
              </Text>
              {item.subtitle ? (
                <Text className="mt-1 text-xs" style={{ color: tokens.textMuted }}>
                  {item.subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
