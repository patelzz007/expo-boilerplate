import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export function useAppFonts() {
  const [fontsLoaded, fontError] = useFonts({
    "SpaceGrotesk-Light": require("@/assets/fonts/SpaceGrotesk-Light.ttf"),
    "SpaceGrotesk-Regular": require("@/assets/fonts/SpaceGrotesk-Regular.ttf"),
    "SpaceGrotesk-Medium": require("@/assets/fonts/SpaceGrotesk-Medium.ttf"),
    "SpaceGrotesk-SemiBold": require("@/assets/fonts/SpaceGrotesk-SemiBold.ttf"),
    "SpaceGrotesk-Bold": require("@/assets/fonts/SpaceGrotesk-Bold.ttf"),

    "Geist-Black": require("@/assets/fonts/Geist/static/Geist-Regular.ttf"),
    "Geist-Bold": require("@/assets/fonts/Geist/static/Geist-Regular.ttf"),
    "Geist-ExtraBold": require("@/assets/fonts/Geist/static/Geist-Regular.ttf"),
    "Geist-ExtraLight": require("@/assets/fonts/Geist/static/Geist-Regular.ttf"),
    "Geist-Light": require("@/assets/fonts/Geist/static/Geist-Regular.ttf"),
    "Geist-Medium": require("@/assets/fonts/Geist/static/Geist-Regular.ttf"),
    "Geist-Regular": require("@/assets/fonts/Geist/static/Geist-Regular.ttf"),
    "Geist-SemiBold": require("@/assets/fonts/Geist/static/Geist-Regular.ttf"),
    "Geist-Thin": require("@/assets/fonts/Geist/static/Geist-Regular.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  return fontsLoaded;
}
