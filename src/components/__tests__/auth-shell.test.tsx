import { render, screen } from "@testing-library/react-native";
import * as React from "react";
import { StatusBar, Text } from "react-native";

import { AppProviders } from "../../../test/app-harness";
import { AuthShell } from "../auth-shell";

describe("AuthShell", () => {
  it("shows the brand and the screen it frames", async () => {
    await render(
      <AppProviders>
        <AuthShell brandName="Acme" tagline="Sign in to pick up where you left off.">
          <Text>Welcome back</Text>
        </AuthShell>
      </AppProviders>
    );

    expect(screen.getByRole("header", { name: "Acme" })).toBeOnTheScreen();
    expect(screen.getByText("Welcome back")).toBeOnTheScreen();
  });

  it("asks for light status-bar icons, since the panel behind them is dark in every theme", async () => {
    const pushStatusBarStyle = jest.spyOn(StatusBar, "pushStackEntry");

    await render(
      <AppProviders>
        <AuthShell brandName="Acme" tagline="Sign in to pick up where you left off.">
          <Text>Welcome back</Text>
        </AuthShell>
      </AppProviders>
    );

    expect(pushStatusBarStyle).toHaveBeenCalledWith(expect.objectContaining({ barStyle: "light-content" }));
  });
});
