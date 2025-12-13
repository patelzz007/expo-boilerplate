import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMenu } from "./MenuContext";

interface CustomHeaderProps {
  title: string;
}

export function CustomHeader({ title }: CustomHeaderProps) {
  const { openMenu } = useMenu();

  return (
    <View className="bg-white px-4 pb-3 pt-14 shadow-sm">
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          onPress={openMenu}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-gray-100"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="menu" size={28} color="#0f172a" />
        </TouchableOpacity>

        <Text className="flex-1 text-center text-xl font-bold text-slate-900">{title}</Text>

        {/* Placeholder for right side to center the title */}
        <View className="h-10 w-10" />
      </View>
    </View>
  );
}
