import React from "react";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface MenuButtonProps {
  onPress: () => void;
}

export function MenuButton({ onPress }: MenuButtonProps) {
  return (
    <TouchableOpacity onPress={onPress} className="ml-4" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Ionicons name="menu" size={28} color="#0f172a" />
    </TouchableOpacity>
  );
}
