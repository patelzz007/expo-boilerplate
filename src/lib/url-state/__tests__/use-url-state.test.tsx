import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as React from "react";
import { Pressable, Text } from "react-native";
import { z } from "zod";

import { UrlStateTestProvider, type UrlUpdateEvent } from "../url-state-test-provider";
import { defineUrlState, optionalUrlParam, pageUrlParam } from "../url-state";
import { useUrlState } from "../use-url-state";

const LIST_URL_STATE = defineUrlState({ page: pageUrlParam(), status: optionalUrlParam(z.enum(["active", "locked"])) });

/** A screen that shows its URL state and changes it with buttons. */
function ListScreen(): React.JSX.Element {
  const [{ page, status }, updateUrlState] = useUrlState(LIST_URL_STATE);
  const nextPage = React.useCallback((): void => {
    updateUrlState({ page: page + 1 });
  }, [page, updateUrlState]);
  const showLocked = React.useCallback((): void => {
    // A filter change goes back to the first page, in one write.
    updateUrlState({ status: "locked", page: 1 });
  }, [updateUrlState]);
  const stay = React.useCallback((): void => {
    updateUrlState({ page });
  }, [page, updateUrlState]);
  return (
    <>
      <Text>{`Page ${String(page)}, ${status ?? "all"}`}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Next page" onPress={nextPage} />
      <Pressable accessibilityRole="button" accessibilityLabel="Locked only" onPress={showLocked} />
      <Pressable accessibilityRole="button" accessibilityLabel="Same page" onPress={stay} />
    </>
  );
}

async function renderList(searchParams: string, onUrlUpdate: (event: UrlUpdateEvent) => void): Promise<void> {
  await render(
    <UrlStateTestProvider searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
      <ListScreen />
    </UrlStateTestProvider>
  );
}

describe("useUrlState", () => {
  it("reads the state the URL names, falling back to defaults", async () => {
    await renderList("?page=3&status=nope", jest.fn());

    expect(screen.getByText("Page 3, all")).toBeOnTheScreen();
  });

  it("changes the state at once and writes the URL after", async () => {
    const onUrlUpdate = jest.fn<undefined, [UrlUpdateEvent]>();
    await renderList("?page=2", onUrlUpdate);

    await fireEvent.press(screen.getByRole("button", { name: "Next page" }));

    expect(screen.getByText("Page 3, all")).toBeOnTheScreen();
    await waitFor((): void => {
      expect(onUrlUpdate).toHaveBeenCalledWith(expect.objectContaining({ queryString: "?page=3" }));
    });
  });

  it("writes several fields as one change, leaving a default out of the URL", async () => {
    const onUrlUpdate = jest.fn<undefined, [UrlUpdateEvent]>();
    await renderList("?page=4", onUrlUpdate);

    await fireEvent.press(screen.getByRole("button", { name: "Locked only" }));

    expect(screen.getByText("Page 1, locked")).toBeOnTheScreen();
    await waitFor((): void => {
      expect(onUrlUpdate).toHaveBeenCalledTimes(1);
    });
    expect(onUrlUpdate).toHaveBeenCalledWith(expect.objectContaining({ queryString: "?status=locked" }));
  });

  it("writes nothing for a change that changes nothing", async () => {
    const onUrlUpdate = jest.fn<undefined, [UrlUpdateEvent]>();
    await renderList("?page=2", onUrlUpdate);

    await fireEvent.press(screen.getByRole("button", { name: "Same page" }));
    await fireEvent.press(screen.getByRole("button", { name: "Next page" }));

    await waitFor((): void => {
      expect(onUrlUpdate).toHaveBeenCalledTimes(1);
    });
    expect(onUrlUpdate).toHaveBeenCalledWith(expect.objectContaining({ queryString: "?page=3" }));
  });
});
