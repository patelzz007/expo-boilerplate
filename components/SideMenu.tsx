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

const SCREEN_WIDTH = Dimensions.get("window").width;
const MENU_WIDTH = SCREEN_WIDTH * 0.75;

interface MenuItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  onPress?: () => void;
}

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
}

export function SideMenu({ visible, onClose }: SideMenuProps) {
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
        }}
        className="absolute bottom-0 left-0 top-0 bg-white shadow-2xl">
        {/* Header Section */}
        <View style={{ paddingTop: insets.top + 16 }} className="bg-slate-900 px-6 pb-8">
          {/* <TouchableOpacity
            onPress={onClose}
            style={{ top: insets.top + 4 }}
            className="absolute right-4"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color="#ffffff" />
          </TouchableOpacity> */}

          <View className="flex-row items-center gap-3">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-white/10">
              <Ionicons name="person" size={32} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-white">Welcome</Text>
              <Text className="text-sm text-white/70">user@example.com</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View className="flex-1 py-4">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleMenuItemPress(item)}
              className="flex-row items-center gap-4 border-b border-gray-100 px-6 py-4 active:bg-gray-50">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-900/5">
                <Ionicons name={item.icon} size={20} color="#0f172a" />
              </View>
              <Text className="flex-1 text-base font-medium text-slate-900">{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer Section */}
        <View className="border-t border-gray-200 px-6 py-6">
          <TouchableOpacity
            onPress={() => {
              console.log("Logout pressed");
              onClose();
            }}
            className="flex-row items-center gap-4 rounded-xl bg-slate-900 px-5 py-4">
            <Ionicons name="log-out-outline" size={22} color="#ffffff" />
            <Text className="text-base font-semibold text-white">Logout</Text>
          </TouchableOpacity>

          <Text className="mt-4 text-center text-xs text-gray-400">Version 1.0.0</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}
