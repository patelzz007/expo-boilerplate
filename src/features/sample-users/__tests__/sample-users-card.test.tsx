import { fireEvent, render, screen } from "@testing-library/react-native";
import * as React from "react";

import { SAMPLE_USERS_COPY } from "../labels";
import { SampleUsersCard, type SampleUsersCardProps } from "../sample-users-card";
import { PARSED_USERS } from "./sample-users-responses";

const NO_USERS: SampleUsersCardProps["users"] = [];

async function renderCard(props: Partial<SampleUsersCardProps>): Promise<void> {
  await render(
    <SampleUsersCard
      status="success"
      users={PARSED_USERS}
      onRetry={jest.fn<undefined, []>()}
      retrying={false}
      {...props}
    />
  );
}

describe("SampleUsersCard", () => {
  it("holds the rows' place with a skeleton while the first load runs", async () => {
    await renderCard({ status: "pending", users: undefined });

    expect(screen.getByTestId("sample-users-skeleton")).toBeOnTheScreen();
    expect(screen.getByLabelText(SAMPLE_USERS_COPY.loading)).toBeOnTheScreen();
    expect(screen.queryByTestId("sample-users-list")).not.toBeOnTheScreen();
  });

  it("lists each user's name, email and company", async () => {
    await renderCard({});

    expect(screen.getByText("Leanne Graham")).toBeOnTheScreen();
    expect(screen.getByText("Sincere@april.biz · Romaguera-Crona")).toBeOnTheScreen();
    expect(screen.getByText("Ervin Howell")).toBeOnTheScreen();
    expect(screen.queryByTestId("sample-users-skeleton")).not.toBeOnTheScreen();
  });

  it("says so when there are no users", async () => {
    await renderCard({ users: NO_USERS });

    expect(screen.getByText(SAMPLE_USERS_COPY.empty)).toBeOnTheScreen();
  });

  it("offers a retry when the load failed", async () => {
    const onRetry = jest.fn<undefined, []>();
    await renderCard({ status: "error", users: undefined, onRetry });

    expect(screen.getByText(SAMPLE_USERS_COPY.error)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: SAMPLE_USERS_COPY.retry }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
