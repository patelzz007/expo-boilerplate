// The Home screen's "Team members" card. Presentational: the screen runs the query
// (use-sample-users.ts) and passes its state in. While the first load runs, a skeleton of the rows
// holds their place, so the card does not jump when the list arrives; a failed load offers a retry.

import * as React from "react";
import { View } from "react-native";

import { Avatar } from "@/ui/components/avatar";
import { Card } from "@/ui/components/card";
import { EmptyState, ErrorState } from "@/ui/components/empty";
import { Separator } from "@/ui/components/separator";
import { Skeleton, SkeletonGroup, SkeletonText } from "@/ui/components/skeleton";
import { BodyText, MutedText } from "@/ui/components/text";

import { SAMPLE_USERS_COPY } from "./labels";
import type { SampleUser } from "./sample-users";

/** One key per placeholder row: as many rows as fit the card before the list arrives. */
const SKELETON_ROW_KEYS = ["first", "second", "third", "fourth", "fifth"];

export type SampleUsersStatus = "pending" | "error" | "success";

export interface SampleUsersCardProps {
  readonly status: SampleUsersStatus;
  /** The loaded users; read only when `status` is `success`. */
  readonly users: readonly SampleUser[] | undefined;
  readonly onRetry: () => void;
  /** A retry is in flight. */
  readonly retrying: boolean;
}

export function SampleUsersCard({ status, users, onRetry, retrying }: SampleUsersCardProps): React.JSX.Element {
  return (
    <Card title={SAMPLE_USERS_COPY.title} description={SAMPLE_USERS_COPY.description} testID="sample-users">
      <SampleUsersBody status={status} users={users} onRetry={onRetry} retrying={retrying} />
    </Card>
  );
}

function SampleUsersBody({ status, users, onRetry, retrying }: SampleUsersCardProps): React.JSX.Element {
  if (status === "pending") {
    return <SampleUsersSkeleton />;
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
  if (users === undefined || users.length === 0) {
    return <EmptyState message={SAMPLE_USERS_COPY.empty} testID="sample-users-empty" />;
  }
  return (
    <View testID="sample-users-list">
      {users.map((user, position): React.JSX.Element => (
        <React.Fragment key={user.id}>
          {position === 0 ? null : <Separator />}
          <SampleUserRow user={user} />
        </React.Fragment>
      ))}
    </View>
  );
}

interface SampleUserRowProps {
  readonly user: SampleUser;
}

function SampleUserRow({ user }: SampleUserRowProps): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-3 py-3" testID={`sample-user-${String(user.id)}`}>
      <Avatar name={user.name} imageUrl={null} size="md" />
      <View className="flex-1 gap-0.5">
        <BodyText numberOfLines={1}>{user.name}</BodyText>
        <MutedText numberOfLines={1}>
          {user.email} · {user.company.name}
        </MutedText>
      </View>
    </View>
  );
}

/** The rows' shape — avatar, name, one muted line — so the list drops into the same space. */
function SampleUsersSkeleton(): React.JSX.Element {
  return (
    <SkeletonGroup accessibilityLabel={SAMPLE_USERS_COPY.loading} testID="sample-users-skeleton">
      {SKELETON_ROW_KEYS.map((key): React.JSX.Element => (
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
