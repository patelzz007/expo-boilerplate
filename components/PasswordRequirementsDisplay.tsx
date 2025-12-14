import React from "react";
import { View, Text } from "react-native";
import { Check, X } from "lucide-react-native";
import { z } from "zod";
import { checkPasswordRequirements } from "@/lib/password-utils";

interface PasswordRequirementsDisplayProps {
  password: string;
}

const passwordPropSchema = z.object({ password: z.string() });

export function PasswordRequirementsDisplay({ password }: PasswordRequirementsDisplayProps) {
  const parsed = passwordPropSchema.safeParse({ password });
  if (!parsed.success) {
    console.warn("PasswordRequirementsDisplay validation failed", z.treeifyError(parsed.error));
    return null;
  }

  const requirements = checkPasswordRequirements(parsed.data.password);

  const requirementItems: Array<{ label: string; met: boolean }> = [
    {
      label: "At least 6 characters",
      met: requirements.minLength,
    },
    {
      label: "One uppercase letter",
      met: requirements.hasUpperCase,
    },
    {
      label: "One lowercase letter",
      met: requirements.hasLowerCase,
    },
    {
      label: "One number",
      met: requirements.hasNumber,
    },
    {
      label: "One special character",
      met: requirements.hasSpecialChar,
    },
  ];

  return (
    <View className="mb-6 space-y-2 rounded-lg bg-slate-50 p-4">
      <Text className="mb-2 text-xs font-semibold text-slate-700">Password Requirements:</Text>
      {requirementItems.map((item, index) => (
        <View key={index} className="flex-row items-center gap-2">
          <View className={`h-5 w-5 items-center justify-center rounded ${item.met ? "bg-green-100" : "bg-slate-200"}`}>
            {item.met ? (
              <Check size={14} color="#22c55e" strokeWidth={3} />
            ) : (
              <X size={14} color="#94a3b8" strokeWidth={3} />
            )}
          </View>
          <Text className={`text-xs ${item.met ? "text-green-700" : "text-slate-500"}`}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}
