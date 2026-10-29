// ============================================
// Home (§10.7) — the starter shell's placeholder dashboard
// ============================================
// Shows who is signed in, a "Discover" carousel of things to try (features/home-highlights), and the
// team members read from a public demo API (features/sample-users) through TanStack Query: a skeleton
// while the first load runs, Previous / Next through the pages (the page on screen stays while the
// next loads), the cached pages on every later visit, and pull to refresh. A team member opens their
// details (team/[id].tsx). Products replace this screen with their own.
//
// The page lives in the URL (`/?page=2`, lib/url-state), not in component state: a deep link opens
// the list on that page, and a page past the end (`?page=99`) settles on the last one.

import { useRouter } from "expo-router";
import * as React from "react";
import { View } from "react-native";

import { Avatar } from "@/ui/components/avatar";
import { Card } from "@/ui/components/card";
import { BodyText, MutedText, Subheading } from "@/ui/components/text";
import { Screen } from "../../../components/screen";
import { HomeHighlights } from "../../../features/home-highlights/home-highlights";
import type { SampleUser } from "../../../features/sample-users/sample-users";
import { pageCountOf, SampleUsersCard } from "../../../features/sample-users/sample-users-card";
import { teamMemberHref } from "../../../features/sample-users/team-member-route";
import { TEAM_MEMBERS_URL_STATE } from "../../../features/sample-users/team-members-url-state";
import { SAMPLE_USERS_PAGE_SIZE, useSampleUsersPage } from "../../../features/sample-users/use-sample-users";
import { useSessionUser } from "../../../features/session/facade";
import { useUrlState } from "../../../lib/url-state/use-url-state";

export default function HomeScreen(): React.JSX.Element {
  const user = useSessionUser();
  const router = useRouter();
  const [{ page }, updateUrlState] = useUrlState(TEAM_MEMBERS_URL_STATE);
  const sampleUsers = useSampleUsersPage(page);
  const changePage = React.useCallback(
    (next: number): void => {
      updateUrlState({ page: next });
    },
    [updateUrlState]
  );
  // A link past the last page lands on the last page, once the list says how many there are.
  const lastPage =
    sampleUsers.data === undefined || sampleUsers.isPlaceholderData
      ? null
      : pageCountOf(sampleUsers.data.total, SAMPLE_USERS_PAGE_SIZE);
  React.useEffect((): void => {
    if (lastPage !== null && page > lastPage) {
      updateUrlState({ page: lastPage }, { history: "replace" });
    }
  }, [lastPage, page, updateUrlState]);
  const { refetch } = sampleUsers;
  // Moving to another page also refetches; only a refetch of the page on screen is a refresh.
  const refreshing = sampleUsers.isRefetching && !sampleUsers.isPlaceholderData;
  const refresh = React.useCallback((): void => {
    void refetch();
  }, [refetch]);
  const openTeamMember = React.useCallback(
    (member: SampleUser): void => {
      router.push(teamMemberHref(member.id));
    },
    [router]
  );

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {user === null ? null : (
        <Card>
          <View className="flex-row items-center gap-4">
            <Avatar name={user.fullName} imageUrl={null} />
            <View className="flex-1 gap-0.5">
              <Subheading>{user.fullName}</Subheading>
              <MutedText>{user.email}</MutedText>
            </View>
          </View>
        </Card>
      )}
      <HomeHighlights />
      <Card title="This is the starter shell">
        <BodyText>
          Sign-in, profile, settings, security and devices are all here as screens. Build your product&apos;s screens on
          top of them.
        </BodyText>
        <MutedText>
          Apart from the team members below, everything runs on local sample data — no backend is needed.
        </MutedText>
      </Card>
      <SampleUsersCard
        status={sampleUsers.status}
        data={sampleUsers.data}
        page={page}
        pageSize={SAMPLE_USERS_PAGE_SIZE}
        onPageChange={changePage}
        changingPage={sampleUsers.isPlaceholderData}
        onSelect={openTeamMember}
        onRetry={refresh}
        retrying={refreshing}
      />
    </Screen>
  );
}
