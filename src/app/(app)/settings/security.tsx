// ============================================
// Security (§10.10) — the same capabilities as the web security panel
// ============================================
// Change password, signed-in devices and sign out everywhere. With no backend, a
// password change is checked with the shared schema and confirmed on this device.

import { useForm } from "@tanstack/react-form";
import { ChangePasswordSchema, type ChangePasswordInput } from "@/shared";
import { useRouter } from "expo-router";
import * as React from "react";

import { Button } from "@/ui/components/button";
import { Card } from "@/ui/components/card";
import { ListRow } from "@/ui/components/list-row";
import { TextField } from "@/ui/components/text-field";
import { Screen } from "../../../components/screen";
import { SignOutEverywhere } from "../../../contexts/identity";
import { useToast } from "../../../features/toast/facade";
import { visibleFieldError } from "../../../lib/form";
import { ROUTES } from "../../../runtime/routes";

const EMPTY_PASSWORD_CHANGE: ChangePasswordInput = { currentPassword: "", newPassword: "", confirmPassword: "" };

export const PASSWORD_CHANGED_MESSAGE = "Password changed.";

export default function SecurityScreen(): React.JSX.Element {
  const router = useRouter();
  const openDevices = React.useCallback((): void => {
    router.push(ROUTES.devices);
  }, [router]);

  return (
    <Screen>
      <Card title="Change password" description="Use at least the length and mix of characters the form asks for.">
        <ChangePasswordForm />
      </Card>
      <Card title="Devices">
        <ListRow
          label="Signed-in devices"
          description="See and sign out the devices on your account"
          onPress={openDevices}
        />
        <SignOutEverywhere />
      </Card>
    </Screen>
  );
}

/** Current + new password with the shared schema; a valid change is confirmed with a toast and the form clears. */
function ChangePasswordForm(): React.JSX.Element {
  const toast = useToast();

  const form = useForm({
    defaultValues: EMPTY_PASSWORD_CHANGE,
    validators: { onChange: ChangePasswordSchema },
    onSubmit: ({ formApi }): void => {
      toast.success(PASSWORD_CHANGED_MESSAGE);
      formApi.reset();
    },
  });
  const submit = React.useCallback((): void => {
    form.handleSubmit().catch((error: unknown): void => {
      console.error("Changing the password failed", error);
    });
  }, [form]);

  return (
    <>
      <form.Field name="currentPassword">
        {(field): React.JSX.Element => (
          <TextField
            label="Current password"
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={visibleFieldError(field.state.meta)}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
          />
        )}
      </form.Field>
      <form.Field name="newPassword">
        {(field): React.JSX.Element => (
          <TextField
            label="New password"
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={visibleFieldError(field.state.meta)}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
          />
        )}
      </form.Field>
      <form.Field name="confirmPassword">
        {(field): React.JSX.Element => (
          <TextField
            label="Confirm new password"
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={visibleFieldError(field.state.meta)}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
          />
        )}
      </form.Field>
      <Button label="Change password" onPress={submit} />
    </>
  );
}
