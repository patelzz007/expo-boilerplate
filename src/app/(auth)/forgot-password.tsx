// ============================================
// Forgot password (§10.6) — the reset-email request
// ============================================
// UI only: there is no API, so no email is sent — the screen shows the same confirmation the real
// request would (it is worded the same whether or not the account exists).

import { useForm } from "@tanstack/react-form";
import { ForgotPasswordSchema, type ForgotPasswordInput } from "@/shared";
import { useRouter } from "expo-router";
import * as React from "react";

import { AuthPage } from "../../components/auth-page";
import { Button } from "@/ui/components/button";
import { TextField } from "@/ui/components/text-field";
import { TextLink } from "@/ui/components/text-link";
import { simulateRequest } from "../../contexts/identity/auth/demo-sign-in";
import { visibleFieldError } from "../../lib/form";
import { ROUTES } from "../../runtime/routes";

const EMPTY_REQUEST: ForgotPasswordInput = { email: "" };

export default function ForgotPasswordScreen(): React.JSX.Element {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [requestedEmail, setRequestedEmail] = React.useState<string | null>(null);

  const form = useForm({
    defaultValues: EMPTY_REQUEST,
    validators: { onChange: ForgotPasswordSchema },
    onSubmit: async ({ value }): Promise<void> => {
      const input = ForgotPasswordSchema.parse(value);
      setPending(true);
      await simulateRequest();
      setPending(false);
      setRequestedEmail(input.email);
    },
  });
  const submit = React.useCallback((): void => {
    void form.handleSubmit();
  }, [form]);
  const backToSignIn = React.useCallback((): void => {
    router.replace(ROUTES.signIn);
  }, [router]);

  if (requestedEmail !== null) {
    return (
      <AuthPage
        title="Check your email"
        description={`If an account exists for ${requestedEmail}, we sent a reset link. Open it on any device to choose a new password, then come back and sign in.`}>
        <Button label="Back to sign in" onPress={backToSignIn} />
      </AuthPage>
    );
  }

  return (
    <AuthPage
      title="Reset your password"
      description="Enter your account's email and we'll send you a link to choose a new password."
      footer={<TextLink leadIn="Remembered it?" label="Back to sign in" onPress={backToSignIn} />}>
      <form.Field name="email">
        {(field): React.JSX.Element => (
          <TextField
            label="Email"
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={visibleFieldError(field.state.meta)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            onSubmitEditing={submit}
          />
        )}
      </form.Field>
      <Button label="Send reset link" onPress={submit} loading={pending} />
    </AuthPage>
  );
}
