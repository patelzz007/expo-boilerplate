import React from "react";
import { Text, View } from "react-native";
import { z, treeifyError } from "zod";
import { useTheme } from "./ThemeProvider";
import { EditScreenInfo } from "./EditScreenInfo";

const screenContentPropsSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  path: z.string().trim().min(1, "Path is required"),
  children: z.custom<React.ReactNode>().optional(),
});

type ScreenContentProps = z.infer<typeof screenContentPropsSchema>;

export const ScreenContent = (rawProps: ScreenContentProps) => {
  const parsed = screenContentPropsSchema.safeParse(rawProps);
  if (!parsed.success) {
    console.warn("ScreenContent validation failed", z.treeifyError(parsed.error));
    return null;
  }
  const { title, path, children } = parsed.data;
  const { tokens } = useTheme();
  return (
    <View className="items-center" style={{ backgroundColor: tokens.bg }}>
      <Text className="font-bold text-xl" style={{ color: tokens.text }}>{title}</Text>
      <View className="my-7 h-[1px] w-4/5" style={{ backgroundColor: tokens.border }} />
      <EditScreenInfo path={path} />
      {children}
    </View>
  );
};
