import React, { createContext, useCallback, useContext, useState } from "react";
import { View, Pressable } from "react-native";
import Animated, { SlideInUp, SlideOutDown } from "react-native-reanimated";
import { Text } from "./Text";
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react-native";
import { z, treeifyError } from "zod";
import { useTheme } from "./ThemeProvider";

const toastTypeEnum = z.enum(["success", "error", "info", "warning"]);

const toastInputSchema = z.object({
  message: z.string().trim().min(1, "Toast message is required"),
  type: toastTypeEnum.default("info"),
  duration: z.number().int().min(500).max(15000).optional().default(3000),
});

type ToastInput = z.infer<typeof toastInputSchema>;
type ToastType = ToastInput["type"];

interface Toast extends ToastInput {
  id: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type?: ToastType, duration?: number) => {
    const parsed = toastInputSchema.safeParse({ message, type, duration });
    if (!parsed.success) {
      console.warn("Toast validation failed", treeifyError(parsed.error));
      return;
    }

    const toast = parsed.data;
    const id = Math.random().toString(36).slice(2, 11);
    const newToast: Toast = { id, ...toast };

    setToasts((prev) => [...prev, newToast]);

    if (toast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, toast.duration);
    }
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle size={20} color="#22c55e" strokeWidth={2} />;
      case "error":
        return <AlertCircle size={20} color="#ef4444" strokeWidth={2} />;
      case "warning":
        return <AlertTriangle size={20} color="#f97316" strokeWidth={2} />;
      default:
        return <Info size={20} color="#3b82f6" strokeWidth={2} />;
    }
  };

  const { tokens } = useTheme();

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View className="pointer-events-none absolute bottom-0 left-0 right-0 p-4">
        {toasts.map((toast) => (
          <Animated.View
            key={toast.id}
            entering={SlideInUp.duration(300)}
            exiting={SlideOutDown.duration(200)}
            className="mb-2">
            <Pressable
              onPress={() => removeToast(toast.id)}
              className="flex-row items-center gap-3 rounded-lg border px-4 py-3 pointer-events-auto"
              style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}>
              {getIcon(toast.type)}
              <Text className="flex-1 text-sm font-medium" style={{ color: tokens.text }}>
                {toast.message}
              </Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");

  return context;
}
