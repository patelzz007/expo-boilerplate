import React from "react";
import { View, Text } from "react-native";
import { z } from "zod";
import { calculatePasswordStrength, getStrengthColor, getStrengthLabel } from "@/lib/password-utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

const passwordPropSchema = z.object({ password: z.string() });

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const parsed = passwordPropSchema.safeParse({ password });
  if (!parsed.success) {
    console.warn("PasswordStrengthIndicator validation failed", z.treeifyError(parsed.error));
    return null;
  }

  const strength = calculatePasswordStrength(parsed.data.password);
  const strengthColor = getStrengthColor(strength);
  const strengthLabel = getStrengthLabel(strength);

  if (!parsed.data.password) return null;

  const strengthPercentage = strength === "weak" ? 25 : strength === "fair" ? 50 : strength === "good" ? 75 : 100;

  return (
    <View className="mb-3 space-y-1">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-medium text-slate-600">Password Strength:</Text>
        <Text className="text-xs font-semibold" style={{ color: strengthColor }}>
          {strengthLabel}
        </Text>
      </View>
      <View className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <View
          style={{
            width: `${strengthPercentage}%`,
            backgroundColor: strengthColor,
          }}
          className="h-full rounded-full"
        />
      </View>
    </View>
  );
}
