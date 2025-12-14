import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text, TextInput, TextInputProps, TouchableOpacity, View } from "react-native";
import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { z } from "zod";

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
    console.warn("Input validation failed", z.treeifyError(parsed.error));
    return null;
  }
  const validatedProps = parsed.data;
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className="mb-6">
      <Text className="mb-2 text-sm font-groteskSemiBold text-slate-900">{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
          <>
            <View className="flex-row items-center rounded-xl border border-gray-200 bg-slate-50 px-4">
              {icon && <Ionicons name={icon} size={20} color="#64748b" />}
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholderTextColor="#94a3b8"
                secureTextEntry={isPassword && !showPassword}
                className={`flex-1 py-4 text-base text-slate-900 ${icon ? "ml-3" : ""}`}
                {...textInputProps}
              />
              {isPassword && (
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>
            {error && <Text className="mt-1 text-xs text-red-600">{error}</Text>}
          </>
        )}
      />
    </View>
  );
}
