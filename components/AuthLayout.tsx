import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode } from "react";
import { useTheme } from "./ThemeProvider";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  showBackButton?: boolean;
  showLogo?: boolean;
}

export function AuthLayout({ children, title, subtitle, showBackButton = false, showLogo = true }: AuthLayoutProps) {
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
