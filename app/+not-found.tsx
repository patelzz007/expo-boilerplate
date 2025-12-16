import { Link, Stack } from "expo-router";
import { useTheme } from "@/components/ThemeProvider";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  const { tokens } = useTheme();
  return (
    <View className={`flex-1 items-center justify-center`} style={{ backgroundColor: tokens.bg }}>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="items-center justify-center">
        <Text className={`font-bold text-xl`} style={{ color: tokens.text }}>{"This screen doesn't exist."}</Text>
        <Link href="/" className={`mt-4 pt-4`}>
          <Text className={`text-base`} style={{ color: tokens.accent }}>Go to home screen!</Text>
        </Link>
      </View>
    </View>
  );
}
