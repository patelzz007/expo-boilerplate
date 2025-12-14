import { ScrollView, View, Text, TouchableOpacity, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useMenu } from "@/components/MenuContext";

export default function Settings() {
  const { openMenu } = useMenu();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [autoSync, setAutoSync] = useState(true);

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View className="bg-slate-900 px-6 pb-10 pt-14">
          {/* Top Bar with Menu and Notification */}
          <View className="mb-6 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={openMenu}
              className="h-10 w-10 items-center justify-center rounded-full active:bg-white/10"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="menu" size={28} color="#ffffff" />
            </TouchableOpacity>
            <View className="h-12 w-12 items-center justify-center rounded-full bg-white/10">
              <Ionicons name="notifications-outline" size={24} color="#ffffff" />
            </View>
          </View>

          {/* Title Content */}
          <View>
            <Text className="text-3xl font-bold text-white">Settings</Text>
            <Text className="mt-2 text-sm text-white/60">Manage your preferences and account</Text>
          </View>
        </View>
        {/* Profile Section */}
        <View className="border-b border-gray-100 bg-slate-50 px-6 py-6">
          <View className="flex-row items-center gap-4">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-slate-900">
              <Text className="text-2xl font-bold text-white">JD</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-slate-900">John Doe</Text>
              <Text className="text-sm text-slate-600">user@example.com</Text>
              <TouchableOpacity className="mt-2">
                <Text className="text-sm font-semibold text-slate-900">Edit Profile</Text>
              </TouchableOpacity>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </View>
        </View>

        {/* Account Settings */}
        <View className="px-6 py-6">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Account</Text>
          <View className="overflow-hidden rounded-xl bg-white shadow-sm">
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
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Notifications</Text>
          <View className="overflow-hidden rounded-xl bg-white shadow-sm">
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
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Preferences</Text>
          <View className="overflow-hidden rounded-xl bg-white shadow-sm">
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
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Support</Text>
          <View className="overflow-hidden rounded-xl bg-white shadow-sm">
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
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center px-6 py-4 active:bg-gray-50 ${showBorder ? "border-t border-gray-100" : ""}`}>
      <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-900/5">
        <Ionicons name={icon} size={20} color="#0f172a" />
      </View>
      <Text className="ml-3 flex-1 text-base font-medium text-slate-900">{label}</Text>
      {value && <Text className="mr-2 text-sm text-slate-500">{value}</Text>}
      <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
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
  return (
    <View className={`flex-row items-center px-6 py-4 ${showBorder ? "border-t border-gray-100" : ""}`}>
      <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-900/5">
        <Ionicons name={icon} size={20} color="#0f172a" />
      </View>
      <Text className="ml-3 flex-1 text-base font-medium text-slate-900">{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#e2e8f0", true: "#0f172a" }}
        thumbColor="#ffffff"
      />
    </View>
  );
}
