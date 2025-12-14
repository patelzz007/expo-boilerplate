import React from "react";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { z } from "zod";

const menuButtonPropsSchema = z.object({
  onPress: z.custom<() => void>(),
});

type MenuButtonProps = z.infer<typeof menuButtonPropsSchema>;

export function MenuButton(rawProps: MenuButtonProps) {
  const parsed = menuButtonPropsSchema.safeParse(rawProps);
  if (!parsed.success) {
    console.warn("MenuButton validation failed", z.treeifyError(parsed.error));
    return null;
  }
  const { onPress } = parsed.data;
  return (
    <TouchableOpacity onPress={onPress} className="ml-4" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Ionicons name="menu" size={28} color="#0f172a" />
    </TouchableOpacity>
  );
}
