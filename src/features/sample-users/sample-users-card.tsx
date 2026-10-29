// The Home screen's "Team members" card. Presentational: the screen runs the query
// (use-sample-users.ts) and passes its state in. While the first load runs, a skeleton of the rows
// holds their place, so the card does not jump when the list arrives; a failed load offers a retry.
// Under the list, Previous / Next move through the pages; a row opens that person's details.

import ChevronRightIcon from "lucide-react-native/icons/chevron-right";
import * as React from "react";
import { Pressable, View } from "react-native";

import { Avatar } from "@/ui/components/avatar";
import { Card } from "@/ui/components/card";
import { EmptyState, ErrorState } from "@/ui/components/empty";
import { Icon } from "@/ui/components/icon";
import { Pagination } from "@/ui/components/pagination";
import { Separator } from "@/ui/components/separator";
import { Skeleton, SkeletonGroup, SkeletonText } from "@/ui/components/skeleton";
import { BodyText, MutedText } from "@/ui/components/text";

import { SAMPLE_USERS_COPY } from "./labels";
import type { SampleUser, SampleUsersPage } from "./sample-users";

const FIRST_PAGE = 1;
const FIRST_POSITION = 0;

export type SampleUsersStatus = "pending" | "error" | "success";

export interface SampleUsersCardProps {
  readonly status: SampleUsersStatus;
  /** The page on screen; read only when `status` is `success`. */
  readonly data: SampleUsersPage | undefined;
  /** The page asked for (1-based). */
  readonly page: number;
  readonly pageSize: number;
  readonly onPageChange: (page: number) => void;
  /** Another page is loading while the previous one stays on screen. */
  readonly changingPage: boolean;
  readonly onSelect: (user: SampleUser) => void;
  readonly onRetry: () => void;
  /** A retry is in flight. */
  readonly retrying: boolean;
}

/** How many pages `total` users fill, never fewer than one. */
export function pageCountOf(total: number, pageSize: number): number {
  return Math.max(FIRST_PAGE, Math.ceil(total / pageSize));
}

export function SampleUsersCard(props: SampleUsersCardProps): React.JSX.Element {
  return (
    <Card title={SAMPLE_USERS_COPY.title} description={SAMPLE_USERS_COPY.description} testID="sample-users">
      <SampleUsersBody {...props} />
    </Card>
  );
}

function SampleUsersBody({
  status,
  data,
  page,
  pageSize,
  onPageChange,
  changingPage,
  onSelect,
  onRetry,
  retrying,
}: SampleUsersCardProps): React.JSX.Element {
  if (status === "pending") {
    return <SampleUsersSkeleton rows={pageSize} />;
  }
  if (status === "error") {
    return (
      <ErrorState
        message={SAMPLE_USERS_COPY.error}
        retryLabel={SAMPLE_USERS_COPY.retry}
        onRetry={onRetry}
        retrying={retrying}
        testID="sample-users-error"
      />
    );
  }
  if (data === undefined || data.users.length === 0) {
    return <EmptyState message={SAMPLE_USERS_COPY.empty} testID="sample-users-empty" />;
  }
  const pageCount = pageCountOf(data.total, pageSize);
  return (
    <View className="gap-3">
      <View testID="sample-users-list">
        {data.users.map((user, position): React.JSX.Element => (
          <React.Fragment key={user.id}>
            {position === FIRST_POSITION ? null : <Separator />}
            <SampleUserRow user={user} onSelect={onSelect} />
          </React.Fragment>
        ))}
      </View>
      {pageCount > FIRST_PAGE ? (
        <Pagination
          page={page}
          pageCount={pageCount}
          onChange={onPageChange}
          loading={changingPage}
          size="sm"
          accessibilityLabel={SAMPLE_USERS_COPY.pagination}
          testID="sample-users-pagination"
        />
      ) : null}
    </View>
  );
}

interface SampleUserRowProps {
  readonly user: SampleUser;
  readonly onSelect: (user: SampleUser) => void;
}

function SampleUserRow({ user, onSelect }: SampleUserRowProps): React.JSX.Element {
  const select = React.useCallback((): void => {
    onSelect(user);
  }, [onSelect, user]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${user.name}, ${user.email}`}
      accessibilityHint={SAMPLE_USERS_COPY.openDetailsHint}
      onPress={select}
      className="flex-row items-center gap-3 py-3 active:opacity-70"
      testID={`sample-user-${String(user.id)}`}>
      <Avatar name={user.name} imageUrl={null} size="md" />
      <View className="flex-1 gap-0.5">
        <BodyText numberOfLines={1}>{user.name}</BodyText>
        <MutedText numberOfLines={1}>
          {user.email} · {user.company.name}
        </MutedText>
      </View>
      <Icon icon={ChevronRightIcon} size="md" colorClassName="accent-muted-foreground" />
    </Pressable>
  );
}

interface SampleUsersSkeletonProps {
  /** As many placeholder rows as a page holds. */
  readonly rows: number;
}

/** The rows' shape — avatar, name, one muted line — so the list drops into the same space. */
function SampleUsersSkeleton({ rows }: SampleUsersSkeletonProps): React.JSX.Element {
  const keys = React.useMemo(
    (): readonly string[] => Array.from({ length: rows }, (_unused, row): string => `row-${String(row)}`),
    [rows]
  );
  return (
    <SkeletonGroup accessibilityLabel={SAMPLE_USERS_COPY.loading} testID="sample-users-skeleton">
      {keys.map((key): React.JSX.Element => (
        <View key={key} className="flex-row items-center gap-3 py-3">
          <Skeleton className="size-8 rounded-full" />
          <View className="flex-1 gap-0.5">
            <SkeletonText size="base" widthClassName="w-2/5" />
            <SkeletonText size="sm" widthClassName="w-4/5" />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}
