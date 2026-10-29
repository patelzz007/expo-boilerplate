// ============================================
// Team member — one person from Home's team members list (features/sample-users)
// ============================================
// The id comes from the route and is parsed before anything is requested; an id that is not a
// positive whole number, or one the API does not know, shows "not found". The person is cached per
// id (TanStack Query), so opening them again shows them at once; pull to refresh refetches.

import { useLocalSearchParams } from "expo-router";
import * as React from "react";

import { Screen } from "../../../../components/screen";
import { SampleUserDetails, type SampleUserDetailsStatus } from "../../../../features/sample-users/sample-user-details";
import { isUserNotFound } from "../../../../features/sample-users/sample-users";
import { teamMemberIdOf } from "../../../../features/sample-users/team-member-route";
import { useSampleUserDetails } from "../../../../features/sample-users/use-sample-users";

export default function TeamMemberScreen(): React.JSX.Element {
  const params = useLocalSearchParams();
  const id = teamMemberIdOf(params);
  const details = useSampleUserDetails(id);
  const { refetch } = details;
  const refresh = React.useCallback((): void => {
    void refetch();
  }, [refetch]);
  const status: SampleUserDetailsStatus = id === null || isUserNotFound(details.error) ? "notFound" : details.status;

  return (
    <Screen refreshing={details.isRefetching} {...(id === null ? {} : { onRefresh: refresh })}>
      <SampleUserDetails status={status} user={details.data} onRetry={refresh} retrying={details.isRefetching} />
    </Screen>
  );
}
