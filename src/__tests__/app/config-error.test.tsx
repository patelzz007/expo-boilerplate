import { renderRouter, screen } from "expo-router/testing-library";
import * as SplashScreen from "expo-splash-screen";
import * as React from "react";
import { Text } from "react-native";

import { TEST_RAW_ENV, testRuntimeInputs } from "../../../test/app-harness";
import ConfigErrorScreen from "../../app/config-error";
import RootLayout from "../../app/_layout";
import { createAppRuntime } from "../../runtime/app-runtime";
import { createDeviceAppRuntime } from "../../runtime/device-runtime";

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("../../runtime/device-runtime", () => ({ createDeviceAppRuntime: jest.fn() }));

function HomeMarker(): React.JSX.Element {
  return <Text>home screen</Text>;
}

describe("RootLayout with an invalid environment", () => {
  it("shows only the config error screen, naming the variable with an example and never the configured value", async () => {
    jest
      .mocked(createDeviceAppRuntime)
      .mockReturnValue(
        createAppRuntime(
          testRuntimeInputs({ rawEnv: { ...TEST_RAW_ENV, isDevelopment: false, apiUrl: "http://plain.example.com" } })
        )
      );
    await renderRouter(
      { _layout: RootLayout, "config-error": ConfigErrorScreen, "(app)/index": HomeMarker },
      { initialUrl: "/" }
    );

    expect(await screen.findByText("The app is not configured")).toBeOnTheScreen();
    expect(screen.getByText("EXPO_PUBLIC_API_URL must be an https:// URL.")).toBeOnTheScreen();
    expect(screen.getByText("https://api.example.com")).toBeOnTheScreen();
    expect(screen.queryByText("http://plain.example.com")).toBeNull();
    expect(screen.queryByText("home screen")).toBeNull();
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });
});

describe("ConfigErrorScreen", () => {
  it("still renders when no issue was provided", async () => {
    await renderRouter({ "config-error": ConfigErrorScreen }, { initialUrl: "/config-error" });

    expect(screen.getByText("The configuration could not be read.")).toBeOnTheScreen();
  });
});
