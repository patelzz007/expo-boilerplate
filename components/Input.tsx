import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text, TextInput, TextInputProps, TouchableOpacity, View } from "react-native";
import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { z, treeifyError } from "zod";
import { useTheme } from "./ThemeProvider";

const ionIconSchema = z.custom<keyof typeof Ionicons.glyphMap>(
  (name) => typeof name === "string" && Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, name),
  "Invalid Ionicon name"
);

const inputPropsSchema = z.object({
  label: z.string().trim().min(1, "Input label is required"),
  icon: ionIconSchema.optional(),
  error: z.string().optional(),
  isPassword: z.boolean().default(false),
});

interface InputProps<T extends FieldValues> extends Omit<TextInputProps, "secureTextEntry"> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  isPassword?: boolean;
}

export function Input<T extends FieldValues>({
  name,
  control,
  label,
  icon,
  error,
  isPassword = false,
  ...textInputProps
}: InputProps<T>) {
  const parsed = inputPropsSchema.safeParse({ label, icon, error, isPassword });
  if (!parsed.success) {
    console.warn("Input validation failed", treeifyError(parsed.error));
    return null;
  }
  const validatedProps = parsed.data;
  const [showPassword, setShowPassword] = useState(false);
  const { tokens } = useTheme();

  return (
    <View className="mb-6">
      <Text className="mb-2 text-sm font-groteskSemiBold" style={{ color: tokens.text }}>
        {label}
      </Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
          <>
            <View className="flex-row items-center rounded-xl border px-4" style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}>
              {icon && <Ionicons name={icon} size={20} color={tokens.textMuted} />}
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholderTextColor={tokens.textMuted}
                secureTextEntry={isPassword && !showPassword}
                className={`flex-1 py-4 text-base ${icon ? "ml-3" : ""}`}
                style={{ color: tokens.text }}
                {...textInputProps}
              />
              {isPassword && (
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={tokens.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            {error && <Text className="mt-1 text-xs" style={{ color: "#ef4444" }}>{error}</Text>}
          </>
        )}
      />
    </View>
  );
}
