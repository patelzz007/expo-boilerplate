import React, { createContext, useCallback, useContext, useState } from "react";
import { Modal, Pressable } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from "react-native-reanimated";
import { AlertTriangle, Check, Info, X } from "lucide-react-native";
import { z } from "zod";
import { Text } from "./Text";
import { cn } from "./utils/cn";
import { View } from "./View";

// --------------------
// Types (with Zod validation)
// --------------------
const alertButtonSchema = z.object({
  text: z.string().trim().min(1, "Button text is required"),
  onPress: z.custom<() => void>().optional(),
  style: z.enum(["default", "cancel", "destructive"]).optional(),
});

const alertOptionsSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  message: z.string().optional(),
  buttons: z.array(alertButtonSchema).nonempty().optional(),
  type: z.enum(["default", "success", "error", "warning"]).default("default"),
});

type AlertButton = z.infer<typeof alertButtonSchema>;
type AlertOptions = z.output<typeof alertOptionsSchema>;
type AlertOptionsInput = z.input<typeof alertOptionsSchema>;

interface AlertContextType {
  showAlert: (options: AlertOptionsInput) => void;
  hideAlert: () => void;
}

// --------------------
// Context
// --------------------
const AlertContext = createContext<AlertContextType | undefined>(undefined);

// --------------------
// Provider Component
// --------------------
export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [alertOptions, setAlertOptions] = useState<AlertOptions | null>(null);

  const showAlert = useCallback((options: AlertOptionsInput) => {
    const parsed = alertOptionsSchema.safeParse(options);
    if (!parsed.success) {
      console.warn("Alert validation failed", z.treeifyError(parsed.error));
      return;
    }

    setAlertOptions(parsed.data);
    setVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setVisible(false);
    setTimeout(() => setAlertOptions(null), 300);
  }, []);

  const handleButtonPress = (button: AlertButton) => {
    hideAlert();
    setTimeout(() => {
      button.onPress?.();
    }, 100);
  };

  const getIconForType = (type: AlertOptions["type"] | undefined) => {
    switch (type) {
      case "success":
        return Check;
      case "error":
        return X;
      case "warning":
        return AlertTriangle;
      default:
        return Info;
    }
  };

  const getIconBgColor = (type: AlertOptions["type"] | undefined) => {
    switch (type) {
      case "success":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      case "warning":
        return "bg-amber-500";
      default:
        return "bg-blue-500";
    }
  };

  const getIconColor = (type: AlertOptions["type"] | undefined) => {
    return "#ffffff";
  };

  const getButtonBgColor = (type: AlertOptions["type"] | undefined) => {
    switch (type) {
      case "success":
        return "bg-green-600";
      case "error":
        return "bg-red-600";
      case "warning":
        return "bg-amber-600";
      default:
        return "bg-blue-600";
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <Modal visible={visible} transparent animationType="none" onRequestClose={hideAlert} statusBarTranslucent>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          className="flex-1 items-center justify-center bg-black/40 p-6">
          <Pressable className="absolute inset-0" onPress={hideAlert} />

          <Animated.View entering={ZoomIn.duration(300)} exiting={ZoomOut.duration(200)} className="w-full max-w-sm">
            <View className="overflow-hidden rounded-2xl bg-white shadow-2xl">
              {/* Content */}
              <View className="items-center px-8 py-10">
                {/* Icon */}
                <View
                  className={cn(
                    "mb-6 h-20 w-20 items-center justify-center rounded-full",
                    getIconBgColor(alertOptions?.type)
                  )}>
                  {(() => {
                    const IconComponent = getIconForType(alertOptions?.type);
                    return <IconComponent size={44} color={getIconColor(alertOptions?.type)} strokeWidth={3} />;
                  })()}
                </View>

                {/* Title */}
                <Text className="mb-3 text-center font-bold text-2xl text-slate-900">{alertOptions?.title}</Text>

                {/* Message */}
                {alertOptions?.message && (
                  <Text className="mb-6 px-2 text-center text-base leading-6 text-slate-600">
                    {alertOptions.message}
                  </Text>
                )}

                {/* Buttons */}
                <View className="w-full gap-3">
                  {alertOptions?.buttons?.map((button: AlertButton, index: number) => (
                    <Pressable
                      key={index}
                      onPress={() => handleButtonPress(button)}
                      className="items-center justify-center rounded-xl bg-slate-900 px-6 py-3">
                      <Text className="text-center text-base font-semibold text-white">{button.text}</Text>
                    </Pressable>
                  )) || (
                    <Pressable
                      onPress={hideAlert}
                      className="items-center justify-center rounded-xl bg-slate-900 px-6 py-3">
                      <Text className="text-center text-base font-semibold text-white">OK</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </AlertContext.Provider>
  );
}

// --------------------
// Hook
// --------------------
export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within AlertProvider");
  }
  return context;
}

// --------------------
// Helper Function (Alert.alert replacement)
// --------------------
let globalShowAlert: ((options: AlertOptions) => void) | null = null;

export function setGlobalAlertHandler(handler: (options: AlertOptions) => void) {
  globalShowAlert = handler;
}

export const Alert = {
  alert: (title: string, message?: string, buttons?: AlertButton[], options?: { type?: AlertOptions["type"] }) => {
    if (globalShowAlert) {
      globalShowAlert({
        title,
        message,
        buttons,
        type: options?.type || "default",
      });
    }
  },
};
