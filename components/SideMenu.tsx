import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Easing,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { z, treeifyError } from "zod";
import { useTheme } from "./ThemeProvider";

const SCREEN_WIDTH = Dimensions.get("window").width;
const MENU_WIDTH = SCREEN_WIDTH * 0.75;

const menuItemSchema = z.object({
  label: z.string().trim().min(1, "Menu label is required"),
  icon: z.custom<keyof typeof Ionicons.glyphMap>(
    (name) => typeof name === "string" && Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, name),
    "Invalid Ionicon name"
  ),
  route: z.string().optional(),
  onPress: z.custom<() => void>().optional(),
});

type MenuItem = z.infer<typeof menuItemSchema>;

const sideMenuPropsSchema = z.object({
  visible: z.boolean(),
  onClose: z.custom<() => void>(),
});

type SideMenuProps = z.infer<typeof sideMenuPropsSchema>;

export function SideMenu(rawProps: SideMenuProps) {
  const parsed = sideMenuPropsSchema.safeParse(rawProps);
  if (!parsed.success) {
    console.warn("SideMenu validation failed", z.treeifyError(parsed.error));
    return null;
  }
  const { visible, onClose } = parsed.data;
  const { tokens } = useTheme();
  const slideAnim = React.useRef(new Animated.Value(-MENU_WIDTH)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.95)).current;
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (visible) {
      // Reset values before animation starts
      slideAnim.setValue(-MENU_WIDTH);
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.95);

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: -MENU_WIDTH,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 0.95,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim, scaleAnim]);

  const menuItems: MenuItem[] = [
    {
      label: "Home",
      icon: "home-outline",
      route: "/",
    },
    {
      label: "Details",
      icon: "list-outline",
      route: "/details",
    },
    {
      label: "Profile",
      icon: "person-outline",
      onPress: () => {
        console.log("Profile pressed");
        onClose();
      },
    },
    {
      label: "Settings",
      icon: "settings-outline",
      route: "/settings",
    },
    {
      label: "Notifications",
      icon: "notifications-outline",
      onPress: () => {
        console.log("Notifications pressed");
        onClose();
      },
    },
  ];

  const handleMenuItemPress = (item: MenuItem) => {
    if (item.route) {
      router.push(item.route as any);
      onClose();
    } else if (item.onPress) {
      item.onPress();
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={{
            opacity: opacityAnim,
          }}
          className="absolute inset-0 bg-black/50"
        />
      </TouchableWithoutFeedback>

      <Animated.View
        style={{
          transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
          width: MENU_WIDTH,
          backgroundColor: tokens.surface,
        }}
        className="absolute bottom-0 left-0 top-0 shadow-2xl">
        {/* Header Section */}
        <View style={{ paddingTop: insets.top + 16, backgroundColor: tokens.primary }} className="px-6 pb-8">
          {/* <TouchableOpacity
            onPress={onClose}
            style={{ top: insets.top + 4 }}
            className="absolute right-4"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color="#ffffff" />
          </TouchableOpacity> */}

          <View className="flex-row items-center gap-3">
            <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
              <Ionicons name="person" size={32} color={tokens.primaryTextOn as any} />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold" style={{ color: tokens.primaryTextOn }}>Welcome</Text>
              <Text className="text-sm" style={{ color: tokens.primaryTextOn, opacity: 0.7 }}>user@example.com</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View className="flex-1 py-4">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleMenuItemPress(item)}
              className="flex-row items-center gap-4 border-b px-6 py-4 active:bg-gray-50"
              style={{ borderColor: tokens.border }}>
              <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(15,23,42,0.05)" }}>
                <Ionicons name={item.icon} size={20} color={tokens.text as any} />
              </View>
              <Text className="flex-1 text-base font-medium" style={{ color: tokens.text }}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={tokens.textMuted as any} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer Section */}
        <View className="border-t px-6 py-6" style={{ borderColor: tokens.border }}>
          <TouchableOpacity
            onPress={() => {
              onClose();
              // Navigate to login after menu closes
              setTimeout(() => {
                router.replace("/(auth)/login");
              }, 300);
            }}
            className="flex-row items-center gap-4 rounded-xl px-5 py-4"
            style={{ backgroundColor: tokens.primary }}>
            <Ionicons name="log-out-outline" size={22} color={tokens.primaryTextOn as any} />
            <Text className="text-base font-semibold" style={{ color: tokens.primaryTextOn }}>Logout</Text>
          </TouchableOpacity>
          <Text className="mt-4 text-center text-xs" style={{ color: tokens.textMuted }}>Version 1.0.0</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}
