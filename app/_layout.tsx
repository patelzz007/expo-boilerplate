import "../global.css";

import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAppFonts } from "@/hooks/useAppFonts";
import { AlertProvider } from "@/components/Alert";
import { ToastProvider } from "@/components/Toast";
import { ActivityIndicator, View, Text as RNText } from "react-native";

const queryClient = new QueryClient();

export default function RootLayout() {
  const fontsLoaded = useAppFonts();

  console.log("Fonts loaded:", fontsLoaded);

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  // Set a global default font family so native Text uses Space Grotesk by default
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const T: any = RNText;
  T.defaultProps = T.defaultProps || {};
  T.defaultProps.style = [{ fontFamily: "SpaceGrotesk-Regular" }, T.defaultProps.style];

  return (
    <QueryClientProvider client={queryClient}>
      <AlertProvider>
        <ToastProvider>
          <Stack>
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="user-details" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" options={{ title: "Oops!", headerShown: false }} />
          </Stack>
        </ToastProvider>
      </AlertProvider>
    </QueryClientProvider>
  );
}
