// The Expo Router adapter against a real (in-memory) Expo Router: the URL a screen ends up with is
// read back from the router itself, not from a fake.

import { Stack, useRouter } from "expo-router";
import { fireEvent, renderRouter, screen, waitFor } from "expo-router/testing-library";
import * as React from "react";
import { Pressable, Text } from "react-native";
import { z } from "zod";

import { routeParamsOf, UrlStateProvider } from "../url-state-provider";
import { defineUrlState, optionalUrlParam, pageUrlParam } from "../url-state";
import { useUrlState } from "../use-url-state";

const LIST_URL_STATE = defineUrlState({ page: pageUrlParam() });
const MEMBER_URL_STATE = defineUrlState({ tab: optionalUrlParam(z.enum(["contact", "company"])) });

function ListScreen(): React.JSX.Element {
  const router = useRouter();
  const [{ page }, updateUrlState] = useUrlState(LIST_URL_STATE);
  const nextPage = React.useCallback((): void => {
    updateUrlState({ page: page + 1 });
  }, [page, updateUrlState]);
  const firstPage = React.useCallback((): void => {
    updateUrlState({ page: 1 });
  }, [updateUrlState]);
  const openMember = React.useCallback((): void => {
    router.push({ pathname: "/team/[id]", params: { id: "7" } });
  }, [router]);
  return (
    <>
      <Text>{`List page ${String(page)}`}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Next page" onPress={nextPage} />
      <Pressable accessibilityRole="button" accessibilityLabel="First page" onPress={firstPage} />
      <Pressable accessibilityRole="button" accessibilityLabel="Open member" onPress={openMember} />
    </>
  );
}

function MemberScreen(): React.JSX.Element {
  const [{ tab }, updateUrlState] = useUrlState(MEMBER_URL_STATE);
  const showCompany = React.useCallback((): void => {
    updateUrlState({ tab: "company" });
  }, [updateUrlState]);
  return (
    <>
      <Text>{`Member tab ${tab ?? "none"}`}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Company tab" onPress={showCompany} />
    </>
  );
}

function RootLayout(): React.JSX.Element {
  return (
    <UrlStateProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </UrlStateProvider>
  );
}

async function renderApp(initialUrl: string): Promise<void> {
  await renderRouter({ _layout: RootLayout, index: ListScreen, "team/[id]": MemberScreen }, { initialUrl });
}

describe("UrlStateProvider on Expo Router", () => {
  it("opens a deep link on the state it names", async () => {
    await renderApp("/?page=2");

    expect(screen.getByText("List page 2")).toBeOnTheScreen();
  });

  it("writes an update into the screen's route params", async () => {
    await renderApp("/?page=2");

    await fireEvent.press(screen.getByRole("button", { name: "Next page" }));

    expect(screen.getByText("List page 3")).toBeOnTheScreen();
    await waitFor((): void => {
      expect(screen).toHaveSearchParams({ page: "3" });
    });
  });

  it("clears a param that goes back to its default", async () => {
    await renderApp("/?page=4");

    await fireEvent.press(screen.getByRole("button", { name: "First page" }));

    expect(screen.getByText("List page 1")).toBeOnTheScreen();
    await waitFor((): void => {
      expect(screen).toHavePathnameWithParams("/");
    });
  });

  it("keeps each screen's state to itself, and a route's path params untouched", async () => {
    await renderApp("/?page=2");
    await fireEvent.press(screen.getByRole("button", { name: "Open member" }));
    expect(await screen.findByText("Member tab none")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Company tab" }));

    await waitFor((): void => {
      expect(screen).toHavePathnameWithParams("/team/7?tab=company");
    });
    expect(screen.getByText("Member tab company")).toBeOnTheScreen();
  });
});

describe("routeParamsOf", () => {
  it("lists each key once, keeping every value of a repeated key", () => {
    expect(routeParamsOf(new URLSearchParams("page=3&id=7&tag=a&tag=b"))).toEqual({
      page: "3",
      id: "7",
      tag: ["a", "b"],
    });
    expect(routeParamsOf(new URLSearchParams())).toEqual({});
  });
});
