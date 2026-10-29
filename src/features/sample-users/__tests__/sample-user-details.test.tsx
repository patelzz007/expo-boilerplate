import { fireEvent, render, screen } from "@testing-library/react-native";
import * as React from "react";

import { SAMPLE_USER_DETAILS_COPY } from "../labels";
import { SampleUserDetails, type SampleUserDetailsProps } from "../sample-user-details";
import { PARSED_USER_DETAILS } from "./sample-users-responses";

async function renderDetails(props: Partial<SampleUserDetailsProps>): Promise<void> {
  await render(
    <SampleUserDetails
      status="success"
      user={PARSED_USER_DETAILS}
      onRetry={jest.fn<undefined, []>()}
      retrying={false}
      {...props}
    />
  );
}

describe("SampleUserDetails", () => {
  it("holds the cards' place with a skeleton while the person loads", async () => {
    await renderDetails({ status: "pending", user: undefined });

    expect(screen.getByTestId("sample-user-skeleton")).toBeOnTheScreen();
    expect(screen.getByLabelText(SAMPLE_USER_DETAILS_COPY.loading)).toBeOnTheScreen();
  });

  it("shows who they are, how to reach them, where they are and where they work", async () => {
    await renderDetails({});

    expect(screen.getByText("Leanne Graham")).toBeOnTheScreen();
    expect(screen.getByText("@Bret")).toBeOnTheScreen();
    expect(screen.getByText("Sincere@april.biz")).toBeOnTheScreen();
    expect(screen.getByText("1-770-736-8031 x56442")).toBeOnTheScreen();
    expect(screen.getByText("hildegard.org")).toBeOnTheScreen();
    expect(screen.getByText("Kulas Light, Apt. 556")).toBeOnTheScreen();
    expect(screen.getByText("Gwenborough")).toBeOnTheScreen();
    expect(screen.getByText("Multi-layered client-server neural-net")).toBeOnTheScreen();
    for (const section of [
      SAMPLE_USER_DETAILS_COPY.contact,
      SAMPLE_USER_DETAILS_COPY.address,
      SAMPLE_USER_DETAILS_COPY.company,
    ]) {
      expect(screen.getByText(section)).toBeOnTheScreen();
    }
  });

  it("says the person was not found, without a retry", async () => {
    await renderDetails({ status: "notFound", user: undefined });

    expect(screen.getByText(SAMPLE_USER_DETAILS_COPY.notFoundTitle)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: SAMPLE_USER_DETAILS_COPY.retry })).not.toBeOnTheScreen();
  });

  it("offers a retry when the load failed", async () => {
    const onRetry = jest.fn<undefined, []>();
    await renderDetails({ status: "error", user: undefined, onRetry });

    await fireEvent.press(screen.getByRole("button", { name: SAMPLE_USER_DETAILS_COPY.retry }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
