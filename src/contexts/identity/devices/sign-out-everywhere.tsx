// "Sign out everywhere" with its confirmation (§10.10, §10.11): every device,
// every app, this phone included. With no backend, that is signing this phone out.

import * as React from "react";

import { Button } from "@/ui/components/button";
import { AlertDialog } from "@/ui/components/alert-dialog";
import { useSessionCommands } from "../../../features/session/facade";
import { DEVICES_COPY } from "./labels";

export function SignOutEverywhere(): React.JSX.Element {
  const session = useSessionCommands();
  const [isOpen, setOpen] = React.useState(false);

  const open = React.useCallback((): void => {
    setOpen(true);
  }, []);
  const close = React.useCallback((): void => {
    setOpen(false);
  }, []);
  const confirm = React.useCallback((): void => {
    // This screen is gone afterwards: the root guard shows sign-in.
    setOpen(false);
    session.signOut();
  }, [session]);

  return (
    <>
      <Button label={DEVICES_COPY.signOutEverywhere} variant="secondary" onPress={open} />
      <AlertDialog
        visible={isOpen}
        title={DEVICES_COPY.signOutEverywhereTitle}
        description={DEVICES_COPY.signOutEverywhereDescription}
        confirmLabel={DEVICES_COPY.signOutEverywhere}
        cancelLabel={DEVICES_COPY.cancel}
        onConfirm={confirm}
        onCancel={close}
        destructive
      />
    </>
  );
}
