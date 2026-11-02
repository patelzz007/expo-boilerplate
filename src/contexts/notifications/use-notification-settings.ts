// The person's notification settings on this phone: read once from Secure Store, and every change
// saved at once — the same "saved as you go" the reference starter kit does against its API.

import type { NotificationPreferencesResponse } from "@/shared";
import * as React from "react";

import { useToast } from "../../features/toast/facade";
import {
  type NotificationSettingsChoices,
  readSecureValueOrDefault,
  SECURE_STORE_ENTRIES,
  writeSecureValue,
} from "../../lib/secure-store";
import { NOTIFICATION_SETTINGS_COPY } from "./labels";
import { DEFAULT_NOTIFICATION_SETTINGS, preferencesOf } from "./sample-preferences";

export interface NotificationSettingsState {
  /** The matrix, schedule and offers; null while the saved choices are read. */
  readonly preferences: NotificationPreferencesResponse | null;
  /** A change is being saved. */
  readonly saving: boolean;
  /** Applies one change to the saved choices and saves them. */
  readonly change: (update: (choices: NotificationSettingsChoices) => NotificationSettingsChoices) => void;
}

export function useNotificationSettings(): NotificationSettingsState {
  const toast = useToast();
  const [choices, setChoices] = React.useState<NotificationSettingsChoices | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect((): (() => void) => {
    let active = true;
    void readSecureValueOrDefault(SECURE_STORE_ENTRIES.notificationSettings, DEFAULT_NOTIFICATION_SETTINGS).then(
      (stored: NotificationSettingsChoices): void => {
        if (active) {
          setChoices(stored);
        }
      }
    );
    return (): void => {
      active = false;
    };
  }, []);

  const change = React.useCallback(
    (update: (current: NotificationSettingsChoices) => NotificationSettingsChoices): void => {
      if (choices === null) {
        return;
      }
      const next = update(choices);
      setChoices(next);
      setSaving(true);
      writeSecureValue(SECURE_STORE_ENTRIES.notificationSettings, next)
        .then((): void => {
          toast.success(NOTIFICATION_SETTINGS_COPY.saved);
        })
        .catch((): void => {
          // Not saved: the screen goes back to what is stored.
          setChoices(choices);
          toast.error(NOTIFICATION_SETTINGS_COPY.saveFailed);
        })
        .finally((): void => {
          setSaving(false);
        });
    },
    [choices, toast]
  );

  const preferences = React.useMemo(
    (): NotificationPreferencesResponse | null => (choices === null ? null : preferencesOf(choices)),
    [choices]
  );
  return { preferences, saving, change };
}
