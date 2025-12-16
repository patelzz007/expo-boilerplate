import { ScrollView, View, Text, TouchableOpacity } from "react-native";

import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMenu } from "@/components/MenuContext";

import { Container } from "@/components/Container";
import { useTheme } from "@/components/ThemeProvider";
import { ScreenContent } from "@/components/ScreenContent";

export default function Details() {
  const { tokens } = useTheme();
  const { name } = useLocalSearchParams();
  const { openMenu } = useMenu();

  return (
    <View className={styles.container}>
      <ScrollView className="flex-1" contentContainerClassName="pb-28" showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View className="px-6 pb-10 pt-14" style={{ backgroundColor: tokens.primary }}>
          {/* Top Bar with Menu and Notification */}
          <View className="mb-6 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={openMenu}
              className="h-10 w-10 items-center justify-center rounded-full active:bg-white/10"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="menu" size={28} color={tokens.primaryTextOn as any} />
            </TouchableOpacity>
            <View className="h-12 w-12 items-center justify-center rounded-full bg-white/10">
              <Ionicons name="notifications-outline" size={24} color={tokens.primaryTextOn as any} />
            </View>
          </View>

          {/* Title Content */}
          <View>
            <Text className="text-3xl font-bold" style={{ color: tokens.primaryTextOn }}>Details</Text>
            <Text className="mt-2 text-sm" style={{ color: tokens.primaryTextOn, opacity: 0.7 }}>Comprehensive insights and analytics</Text>
          </View>
        </View>

        <View className="px-6 pt-6">
          <Container>
            <ScreenContent path="screens/details.tsx" title={`Showing details for user ${name}`} />
          </Container>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = {
  container: "flex flex-1 bg-white",
};
