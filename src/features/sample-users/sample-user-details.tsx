// The team member screen's body: who they are, how to reach them, where they are and where they work.
// Presentational: the route reads the id and runs the query (use-sample-users.ts), then passes its
// state in. A skeleton of the cards holds their place while the person loads; an unknown id says so
// instead of offering a retry that would only fail again.

import UserXIcon from "lucide-react-native/icons/user-x";
import * as React from "react";
import { View } from "react-native";

import { Avatar } from "@/ui/components/avatar";
import { Card } from "@/ui/components/card";
import { DetailList, type DetailItem } from "@/ui/components/detail-list";
import { EmptyState, ErrorState } from "@/ui/components/empty";
import { Skeleton, SkeletonGroup, SkeletonText } from "@/ui/components/skeleton";
import { MutedText, Subheading } from "@/ui/components/text";

import { SAMPLE_USER_DETAILS_COPY } from "./labels";
import type { SampleUserDetails as SampleUserDetailsData } from "./sample-users";

export type SampleUserDetailsStatus = "pending" | "error" | "notFound" | "success";

export interface SampleUserDetailsProps {
  readonly status: SampleUserDetailsStatus;
  /** The person; read only when `status` is `success`. */
  readonly user: SampleUserDetailsData | undefined;
  readonly onRetry: () => void;
  /** A retry is in flight. */
  readonly retrying: boolean;
}

/** One card per subject, with its details as label → value rows. */
interface DetailSection {
  readonly title: string;
  readonly items: readonly DetailItem[];
}

function sectionsOf(user: SampleUserDetailsData): readonly DetailSection[] {
  const copy = SAMPLE_USER_DETAILS_COPY;
  return [
    {
      title: copy.contact,
      items: [
        { label: copy.email, value: user.email },
        { label: copy.phone, value: user.phone },
        { label: copy.website, value: user.website },
      ],
    },
    {
      title: copy.address,
      items: [
        { label: copy.street, value: `${user.address.street}, ${user.address.suite}` },
        { label: copy.city, value: user.address.city },
        { label: copy.zipcode, value: user.address.zipcode },
      ],
    },
    {
      title: copy.company,
      items: [
        { label: copy.companyName, value: user.company.name },
        { label: copy.catchPhrase, value: user.company.catchPhrase },
        { label: copy.business, value: user.company.bs },
      ],
    },
  ];
}

export function SampleUserDetails({ status, user, onRetry, retrying }: SampleUserDetailsProps): React.JSX.Element {
  if (status === "pending") {
    return <SampleUserDetailsSkeleton />;
  }
  if (status === "notFound") {
    return (
      <EmptyState
        icon={UserXIcon}
        title={SAMPLE_USER_DETAILS_COPY.notFoundTitle}
        message={SAMPLE_USER_DETAILS_COPY.notFound}
        testID="sample-user-not-found"
      />
    );
  }
  if (status === "error" || user === undefined) {
    return (
      <ErrorState
        message={SAMPLE_USER_DETAILS_COPY.error}
        retryLabel={SAMPLE_USER_DETAILS_COPY.retry}
        onRetry={onRetry}
        retrying={retrying}
        testID="sample-user-error"
      />
    );
  }
  return (
    <View className="gap-5" testID="sample-user-details">
      <Card>
        <View className="flex-row items-center gap-4">
          <Avatar name={user.name} imageUrl={null} />
          <View className="flex-1 gap-0.5">
            <Subheading numberOfLines={1}>{user.name}</Subheading>
            <MutedText numberOfLines={1}>@{user.username}</MutedText>
          </View>
        </View>
      </Card>
      {sectionsOf(user).map((section): React.JSX.Element => (
        <Card key={section.title} title={section.title}>
          <DetailList items={section.items} variant="stacked" />
        </Card>
      ))}
    </View>
  );
}

/** Placeholder rows per detail card: each card lists three details. */
const SKELETON_SECTION_KEYS = ["contact", "address", "company"];
const SKELETON_ROW_KEYS = ["first", "second", "third"];

/** The cards' shape — the person, then three cards of label → value rows. */
function SampleUserDetailsSkeleton(): React.JSX.Element {
  return (
    <SkeletonGroup
      accessibilityLabel={SAMPLE_USER_DETAILS_COPY.loading}
      testID="sample-user-skeleton"
      className="gap-5">
      <View className="flex-row items-center gap-4 rounded-xl border border-border p-4">
        <Skeleton className="size-14 rounded-full" />
        <View className="flex-1 gap-1">
          <SkeletonText size="lg" widthClassName="w-1/2" />
          <SkeletonText size="sm" widthClassName="w-1/3" />
        </View>
      </View>
      {SKELETON_SECTION_KEYS.map((section): React.JSX.Element => (
        <View key={section} className="gap-3 rounded-xl border border-border p-4">
          <SkeletonText size="lg" widthClassName="w-1/3" />
          {SKELETON_ROW_KEYS.map((row): React.JSX.Element => (
            <View key={row} className="gap-0.5">
              <SkeletonText size="sm" widthClassName="w-1/4" />
              <SkeletonText size="base" widthClassName="w-3/4" />
            </View>
          ))}
        </View>
      ))}
    </SkeletonGroup>
  );
}
