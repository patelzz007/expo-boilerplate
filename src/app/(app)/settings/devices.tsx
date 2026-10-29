// ============================================
// Signed-in devices (§10.11) — the devices on the account, revoke one, sign out everywhere
// ============================================
// Most recently active first (`isCurrent` marks this phone). With no backend the
// list is sample data on this device: revoking a device removes it from the list.

import type { Session } from "@/shared";
import * as React from "react";
import { View } from "react-native";

import { AlertDialog } from "@/ui/components/alert-dialog";
import { EmptyState } from "@/ui/components/empty";
import { DeviceSessionRow } from "../../../components/device-session-row";
import { Screen } from "../../../components/screen";
import {
  clientTypeLabelOf,
  DEVICES_COPY,
  platformLineOf,
  sampleSessionsAt,
  sessionDetailItems,
  SignOutEverywhere,
} from "../../../contexts/identity";
import { useToast } from "../../../features/toast/facade";

export default function DevicesScreen(): React.JSX.Element {
  // When the list was read: the rows' "last active" / "expires" are relative to it.
  const [nowMs] = React.useState((): number => Date.now());
  const [sessions, setSessions] = React.useState<readonly Session[]>((): readonly Session[] => sampleSessionsAt(nowMs));
  const [deviceToRevoke, setDeviceToRevoke] = React.useState<Session | null>(null);
  const toast = useToast();

  const cancelRevoke = React.useCallback((): void => {
    setDeviceToRevoke(null);
  }, []);
  const confirmRevoke = React.useCallback((): void => {
    if (deviceToRevoke === null) {
      return;
    }
    const target = deviceToRevoke;
    setSessions((current: readonly Session[]): readonly Session[] =>
      current.filter((session: Session): boolean => session.id !== target.id)
    );
    setDeviceToRevoke(null);
    toast.success(DEVICES_COPY.revoked(target.label));
  }, [deviceToRevoke, toast]);

  return (
    <Screen description={DEVICES_COPY.description}>
      <View accessibilityLabel={DEVICES_COPY.title}>
        {sessions.length === 0 ? <EmptyState message={DEVICES_COPY.empty} /> : null}
        {sessions.map((session: Session): React.JSX.Element => (
          <DeviceRow key={session.id} session={session} nowMs={nowMs} onRevokeRequest={setDeviceToRevoke} />
        ))}
      </View>
      <SignOutEverywhere />
      <AlertDialog
        visible={deviceToRevoke !== null}
        title={DEVICES_COPY.revokeTitle(deviceToRevoke?.label ?? "")}
        description={DEVICES_COPY.revokeDescription}
        confirmLabel={DEVICES_COPY.revokeConfirm}
        cancelLabel={DEVICES_COPY.cancel}
        onConfirm={confirmRevoke}
        onCancel={cancelRevoke}
        destructive
      />
    </Screen>
  );
}

interface DeviceRowProps {
  readonly session: Session;
  readonly nowMs: number;
  readonly onRevokeRequest: (session: Session) => void;
}

function DeviceRow({ session, nowMs, onRevokeRequest }: DeviceRowProps): React.JSX.Element {
  const handleRevoke = React.useCallback((): void => {
    onRevokeRequest(session);
  }, [onRevokeRequest, session]);
  return (
    <DeviceSessionRow
      label={session.label}
      clientTypeLabel={clientTypeLabelOf(session)}
      platform={platformLineOf(session)}
      details={sessionDetailItems(session, nowMs)}
      isCurrent={session.isCurrent}
      currentLabel={DEVICES_COPY.thisDevice}
      revokeLabel={DEVICES_COPY.revoke}
      onRevoke={handleRevoke}
    />
  );
}
