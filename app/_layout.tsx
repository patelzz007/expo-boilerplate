import "../global.css";

import { AlertProvider } from "@/components/Alert";
import { ThemedErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { useAppFonts } from "@/hooks/useAppFonts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { focusManager, onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, AppStateStatus, Text as RNText, View } from "react-native";

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
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
        <ActivityIndicator size="large" color="#1e293b" />
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
      <ThemeProvider>
        <AlertProvider>
          <ToastProvider>
            <ThemedErrorBoundary>
              <Stack>
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="user-details" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" options={{ title: "Oops!", headerShown: false }} />
              </Stack>
            </ThemedErrorBoundary>
          </ToastProvider>
        </AlertProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
