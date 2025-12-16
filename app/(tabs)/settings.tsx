import { useMenu } from "@/components/MenuContext";
import { useTheme } from "@/components/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";

export default function Settings() {
  const { openMenu } = useMenu();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const { tokens } = useTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: tokens.bg }}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View className="px-6 pb-10 pt-14" style={{ backgroundColor: tokens.primary }}>
          {/* Top Bar with Menu and Notification */}
          <View className="mb-6 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={openMenu}
              className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="menu" size={28} color={tokens.primaryTextOn as any} />
            </TouchableOpacity>
            <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${tokens.primaryTextOn}20` }}>
              <Ionicons name="notifications-outline" size={24} color={tokens.primaryTextOn as any} />
            </View>
          </View>

          {/* Title Content */}
          <View>
            <Text className="text-3xl font-bold" style={{ color: tokens.primaryTextOn }}>Settings</Text>
            <Text className="mt-2 text-sm" style={{ color: `${tokens.primaryTextOn}99` }}>Manage your preferences and account</Text>
          </View>
        </View>
        {/* Profile Section */}
        <View className="px-6 py-6" style={{ backgroundColor: tokens.surface, borderBottomColor: tokens.border, borderBottomWidth: 1 }}>
          <View className="flex-row items-center gap-4">
            <View className="h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: tokens.primary }}>
              <Text className="text-2xl font-bold" style={{ color: tokens.primaryTextOn }}>JD</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold" style={{ color: tokens.text }}>John Doe</Text>
              <Text className="text-sm" style={{ color: tokens.textMuted }}>user@example.com</Text>
              <TouchableOpacity className="mt-2">
                <Text className="text-sm font-semibold" style={{ color: tokens.text }}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
            <Ionicons name="chevron-forward" size={20} color={tokens.border as any} />
          </View>
        </View>

        {/* Account Settings */}
        <View className="px-6 py-6">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: tokens.textMuted }}>Account</Text>
          <View className="overflow-hidden rounded-xl shadow-sm" style={{ backgroundColor: tokens.surface }}>
            <SettingItem
              icon="person-outline"
              label="Personal Information"
              onPress={() => console.log("Personal Info")}
            />
            <SettingItem
              icon="shield-checkmark-outline"
              label="Privacy & Security"
              onPress={() => console.log("Privacy")}
              showBorder
            />
            <SettingItem
              icon="key-outline"
              label="Change Password"
              onPress={() => console.log("Change Password")}
              showBorder
            />
          </View>
        </View>

        {/* Notifications */}
        <View className="px-6 py-2">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: tokens.textMuted }}>Notifications</Text>
          <View className="overflow-hidden rounded-xl shadow-sm" style={{ backgroundColor: tokens.surface }}>
            <SettingToggle
              icon="notifications-outline"
              label="Push Notifications"
              value={pushNotifications}
              onValueChange={setPushNotifications}
            />
            <SettingToggle
              icon="mail-outline"
              label="Email Notifications"
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              showBorder
            />
          </View>
        </View>

        {/* Preferences */}
        <View className="px-6 py-6">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: tokens.textMuted }}>Preferences</Text>
          <View className="overflow-hidden rounded-xl shadow-sm" style={{ backgroundColor: tokens.surface }}>
            <SettingToggle icon="moon-outline" label="Dark Mode" value={darkMode} onValueChange={setDarkMode} />
            <SettingToggle
              icon="sync-outline"
              label="Auto Sync"
              value={autoSync}
              onValueChange={setAutoSync}
              showBorder
            />
            <SettingItem
              icon="language-outline"
              label="Language"
              value="English"
              onPress={() => console.log("Language")}
              showBorder
            />
          </View>
        </View>

        {/* Support */}
        <View className="px-6 py-2">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: tokens.textMuted }}>Support</Text>
          <View className="overflow-hidden rounded-xl shadow-sm" style={{ backgroundColor: tokens.surface }}>
            <SettingItem icon="help-circle-outline" label="Help Center" onPress={() => console.log("Help")} />
            <SettingItem
              icon="chatbubble-outline"
              label="Contact Support"
              onPress={() => console.log("Support")}
              showBorder
            />
            <SettingItem
              icon="document-text-outline"
              label="Terms & Conditions"
              onPress={() => console.log("Terms")}
              showBorder
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View className="px-6 py-6 pb-28">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-red-500">Danger Zone</Text>
          <TouchableOpacity className="rounded-xl border border-red-200 bg-red-50 px-6 py-4">
            <View className="flex-row items-center gap-3">
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text className="flex-1 text-base font-semibold text-red-600">Delete Account</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  showBorder?: boolean;
}

function SettingItem({ icon, label, value, onPress, showBorder }: SettingItemProps) {
  const { tokens } = useTheme();
  
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center px-6 py-4 active:opacity-70 ${showBorder ? "border-t" : ""}`}
      style={showBorder ? { borderTopColor: tokens.border, borderTopWidth: 1 } : {}}>
      <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${tokens.primary}10` }}>
        <Ionicons name={icon} size={20} color={tokens.text as any} />
      </View>
      <Text className="ml-3 flex-1 text-base font-medium" style={{ color: tokens.text }}>{label}</Text>
      {value && <Text className="mr-2 text-sm" style={{ color: tokens.textMuted }}>{value}</Text>}
      <Ionicons name="chevron-forward" size={18} color={tokens.border as any} />
    </TouchableOpacity>
  );
}

interface SettingToggleProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  showBorder?: boolean;
}

function SettingToggle({ icon, label, value, onValueChange, showBorder }: SettingToggleProps) {
  const { tokens } = useTheme();
  
  return (
    <View className={`flex-row items-center px-6 py-4 ${showBorder ? "border-t" : ""}`} style={showBorder ? { borderTopColor: tokens.border, borderTopWidth: 1 } : {}}>
      <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${tokens.primary}10` }}>
        <Ionicons name={icon} size={20} color={tokens.text as any} />
      </View>
      <Text className="ml-3 flex-1 text-base font-medium" style={{ color: tokens.text }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: tokens.border, true: tokens.primary }}
        thumbColor="#ffffff"
      />
    </View>
  );
}
