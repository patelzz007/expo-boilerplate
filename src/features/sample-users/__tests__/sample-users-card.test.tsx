import { fireEvent, render, screen } from "@testing-library/react-native";
import * as React from "react";

import { SAMPLE_USERS_COPY } from "../labels";
import { pageCountOf, SampleUsersCard, type SampleUsersCardProps } from "../sample-users-card";
import { FIRST_PAGE, PARSED_USERS } from "./sample-users-responses";

const PAGE_SIZE = 4;
const PAGE_ONE = 1;
const PAGE_TWO = 2;

async function renderCard(props: Partial<SampleUsersCardProps>): Promise<void> {
  await render(
    <SampleUsersCard
      status="success"
      data={FIRST_PAGE}
      page={PAGE_ONE}
      pageSize={PAGE_SIZE}
      onPageChange={jest.fn<undefined, [number]>()}
      changingPage={false}
      onSelect={jest.fn()}
      onRetry={jest.fn<undefined, []>()}
      retrying={false}
      {...props}
    />
  );
}

describe("SampleUsersCard", () => {
  it("holds the rows' place with a skeleton while the first load runs", async () => {
    await renderCard({ status: "pending", data: undefined });

    expect(screen.getByTestId("sample-users-skeleton")).toBeOnTheScreen();
    expect(screen.getByLabelText(SAMPLE_USERS_COPY.loading)).toBeOnTheScreen();
    expect(screen.queryByTestId("sample-users-list")).not.toBeOnTheScreen();
  });

  it("lists each user's name, email and company", async () => {
    await renderCard({});

    expect(screen.getByText("Leanne Graham")).toBeOnTheScreen();
    expect(screen.getByText("Sincere@april.biz · Romaguera-Crona")).toBeOnTheScreen();
    expect(screen.getByText("Ervin Howell")).toBeOnTheScreen();
  });

  it("opens a user's details when their row is pressed", async () => {
    const onSelect = jest.fn();
    await renderCard({ onSelect });

    await fireEvent.press(screen.getByRole("button", { name: "Ervin Howell, Shanna@melissa.tv" }));

    expect(onSelect).toHaveBeenCalledWith(PARSED_USERS.find((user) => user.id === PAGE_TWO));
  });

  it("shows where the list is and moves to the next page", async () => {
    const onPageChange = jest.fn<undefined, [number]>();
    await renderCard({ onPageChange });

    expect(screen.getByText("Page 1 of 3")).toBeOnTheScreen();
    expect(screen.getByTestId("sample-users-pagination-previous")).toBeDisabled();
    await fireEvent.press(screen.getByTestId("sample-users-pagination-next"));

    expect(onPageChange).toHaveBeenCalledWith(PAGE_TWO);
  });

  it("moves back from a later page", async () => {
    const onPageChange = jest.fn<undefined, [number]>();
    await renderCard({ page: PAGE_TWO, onPageChange });

    await fireEvent.press(screen.getByTestId("sample-users-pagination-previous"));

    expect(onPageChange).toHaveBeenCalledWith(PAGE_ONE);
  });

  it("blocks both buttons while the next page loads", async () => {
    await renderCard({ page: PAGE_TWO, changingPage: true });

    expect(screen.getByTestId("sample-users-pagination-previous")).toBeDisabled();
    expect(screen.getByTestId("sample-users-pagination-next")).toBeDisabled();
  });

  it("leaves out the pagination when everyone fits on one page", async () => {
    await renderCard({ data: { users: PARSED_USERS, total: PARSED_USERS.length } });

    expect(screen.queryByTestId("sample-users-pagination")).not.toBeOnTheScreen();
  });

  it("says so when there are no users", async () => {
    await renderCard({ data: { users: [], total: 0 } });

    expect(screen.getByText(SAMPLE_USERS_COPY.empty)).toBeOnTheScreen();
  });

  it("offers a retry when the load failed", async () => {
    const onRetry = jest.fn<undefined, []>();
    await renderCard({ status: "error", data: undefined, onRetry });

    expect(screen.getByText(SAMPLE_USERS_COPY.error)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: SAMPLE_USERS_COPY.retry }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("pageCountOf", () => {
  it("rounds a part page up and never goes below one", () => {
    expect(pageCountOf(10, PAGE_SIZE)).toBe(3);
    expect(pageCountOf(8, PAGE_SIZE)).toBe(2);
    expect(pageCountOf(0, PAGE_SIZE)).toBe(1);
  });
});
