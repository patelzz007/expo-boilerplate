import "../global.css";

import { Stack } from "expo-router";
import { focusManager, QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { AppState, ActivityIndicator, View, Text as RNText, AppStateStatus } from "react-native";
import { useEffect, useState } from "react";
import { useAppFonts } from "@/hooks/useAppFonts";
import { AlertProvider } from "@/components/Alert";
import { ToastProvider } from "@/components/Toast";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60,
    },
  },
});

export default function RootLayout() {
  const fontsLoaded = useAppFonts();
  const [persistReady, setPersistReady] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status: AppStateStatus) => {
      if (status === "active") focusManager.setFocused(true);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      onlineManager.setOnline(Boolean(state.isConnected));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const persister = createAsyncStoragePersister({ storage: AsyncStorage });
    const [unsubscribe, restorePromise] = persistQueryClient({
      queryClient,
      persister,
      maxAge: 1000 * 60 * 60 * 24, // 24h cache persistence
      buster: "v1",
    });

    restorePromise.then(() => setPersistReady(true)).catch(() => setPersistReady(true));

    return () => unsubscribe();
  }, []);

  console.log("Fonts loaded:", fontsLoaded);

  if (!fontsLoaded || !persistReady) {
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
