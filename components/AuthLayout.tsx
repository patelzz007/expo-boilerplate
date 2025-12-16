import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { treeifyError, z } from "zod";
import { useTheme } from "./ThemeProvider";

const authLayoutPropsSchema = z.object({
  children: z.custom<ReactNode>(),
  title: z.string().trim().min(1, "Title is required"),
  subtitle: z.string().trim().min(1, "Subtitle is required"),
  showBackButton: z.boolean().default(false),
  showLogo: z.boolean().default(true),
});

type AuthLayoutProps = z.infer<typeof authLayoutPropsSchema>;

export function AuthLayout(rawProps: AuthLayoutProps) {
  const parsed = authLayoutPropsSchema.safeParse(rawProps);
  if (!parsed.success) {
    console.warn("AuthLayout validation failed", z.treeifyError(parsed.error));
    return null;
  }
  const { children, title, subtitle, showBackButton, showLogo } = parsed.data;
  const { tokens } = useTheme();
  
  return (
    <View className="flex-1" style={{ backgroundColor: tokens.bg }}>
      {showBackButton && (
        <View className="px-4 pb-3 pt-14 shadow-sm" style={{ backgroundColor: tokens.surface }}>
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={tokens.text as any} />
            </TouchableOpacity>
            <Text className="flex-1 text-center text-xl font-geistBold" style={{ color: tokens.text }}>{title}</Text>
            <View className="h-10 w-10" />
          </View>
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerClassName={showBackButton ? "px-6 pt-8 pb-8" : "px-6 pt-16 pb-8"}
        showsVerticalScrollIndicator={false}>
        {/* Logo/Header Section */}
        {showLogo ? (
          <View className="items-center py-12">
            <View className="h-24 w-24 items-center justify-center rounded-full" style={{ backgroundColor: tokens.primary }}>
              <Ionicons name="checkmark-circle" size={48} color={tokens.primaryTextOn as any} />
            </View>
            <Text className="mt-6 text-3xl font-geistExtraBold" style={{ color: tokens.text }}>{title}</Text>
            <Text className="mt-2 text-base font-geist" style={{ color: tokens.textMuted }}>{subtitle} 123</Text>
          </View>
        ) : (
          <View className="mb-8">
            <Text className="text-3xl font-geistExtraBold" style={{ color: tokens.text }}>{title}</Text>
            <Text className="mt-2 text-base font-geist" style={{ color: tokens.textMuted }}>{subtitle}</Text>
          </View>
        )}

        {children}
      </ScrollView>
    </View>
  );
}
