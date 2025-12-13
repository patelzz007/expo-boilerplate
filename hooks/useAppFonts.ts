import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export function useAppFonts() {
  const [fontsLoaded, fontError] = useFonts({
    "SpaceGrotesk-Regular": require("@/assets/fonts/SpaceGrotesk-Regular.ttf"),
    " SpaceGrotesk-Bold": require("@/assets/fonts/SpaceGrotesk-Bold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  return fontsLoaded;
}
