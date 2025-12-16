import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { z, treeifyError } from "zod";
import { useMenu } from "./MenuContext";
import { useTheme } from "./ThemeProvider";

const customHeaderPropsSchema = z.object({
  title: z.string().trim().min(1, "Header title is required"),
});

type CustomHeaderProps = z.infer<typeof customHeaderPropsSchema>;

export function CustomHeader(rawProps: CustomHeaderProps) {
  const parsed = customHeaderPropsSchema.safeParse(rawProps);
  if (!parsed.success) {
    console.warn("CustomHeader validation failed", z.treeifyError(parsed.error));
    return null;
  }
  const { title } = parsed.data;
  const { openMenu } = useMenu();
  const { tokens } = useTheme();

  return (
    <View className="px-4 pb-3 pt-14 shadow-sm" style={{ backgroundColor: tokens.surface, borderBottomColor: tokens.border, borderBottomWidth: 1 }}>
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          onPress={openMenu}
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="menu" size={28} color={tokens.text} />
        </TouchableOpacity>

        <Text className="flex-1 text-center text-xl font-bold" style={{ color: tokens.text }}>{title}</Text>

        {/* Placeholder for right side to center the title */}
        <View className="h-10 w-10" />
      </View>
    </View>
  );
}
