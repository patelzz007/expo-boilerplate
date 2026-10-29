// ============================================
// Home (§10.7) — the starter shell's placeholder dashboard
// ============================================
// Shows who is signed in, and the team members read from a public demo API (features/sample-users)
// through TanStack Query: a skeleton while the first load runs, the cached list on every later visit,
// pull to refresh. Products replace this screen with their own.

import * as React from "react";
import { View } from "react-native";

import { Avatar } from "@/ui/components/avatar";
import { Card } from "@/ui/components/card";
import { BodyText, MutedText, Subheading } from "@/ui/components/text";
import { Screen } from "../../components/screen";
import { SampleUsersCard } from "../../features/sample-users/sample-users-card";
import { useSampleUsers } from "../../features/sample-users/use-sample-users";
import { useSessionUser } from "../../features/session/facade";

export default function HomeScreen(): React.JSX.Element {
  const user = useSessionUser();
  const sampleUsers = useSampleUsers();
  const { refetch } = sampleUsers;
  const refresh = React.useCallback((): void => {
    void refetch();
  }, [refetch]);

  return (
    <Screen refreshing={sampleUsers.isRefetching} onRefresh={refresh}>
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
        users={sampleUsers.data}
        onRetry={refresh}
        retrying={sampleUsers.isRefetching}
      />
    </Screen>
  );
}
