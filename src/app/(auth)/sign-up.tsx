// ============================================
// Sign up (§10.4) — a native form with the shared SignupSchema
// ============================================
// UI only: there is no API, so a valid form starts a demo session for the new account; the root
// guard then moves on to the app.

import { useForm } from "@tanstack/react-form";
import { SignupSchema, type SignupInput } from "@/shared";
import { useRouter } from "expo-router";
import * as React from "react";

import { AuthPage } from "../../components/auth-page";
import { Button } from "@/ui/components/button";
import { TextField } from "@/ui/components/text-field";
import { TextLink } from "@/ui/components/text-link";
import { simulateRequest } from "../../contexts/identity/auth/demo-sign-in";
import { useSessionCommands } from "../../features/session/facade";
import { visibleFieldError } from "../../lib/form";
import { ROUTES } from "../../runtime/routes";

const EMPTY_SIGNUP: SignupInput = { fullName: "", email: "", password: "" };

export default function SignUpScreen(): React.JSX.Element {
  const router = useRouter();
  const session = useSessionCommands();
  const [pending, setPending] = React.useState(false);

  const form = useForm({
    defaultValues: EMPTY_SIGNUP,
    validators: { onChange: SignupSchema },
    onSubmit: async ({ value }): Promise<void> => {
      const input = SignupSchema.parse(value);
      setPending(true);
      await simulateRequest();
      session.signIn({ fullName: input.fullName, email: input.email });
    },
  });
  const submit = React.useCallback((): void => {
    void form.handleSubmit();
  }, [form]);
  const backToSignIn = React.useCallback((): void => {
    router.replace(ROUTES.signIn);
  }, [router]);

  return (
    <AuthPage
      title="Create an account"
      description="Enter your details to get started."
      footer={<TextLink leadIn="Already have an account?" label="Sign in" onPress={backToSignIn} />}>
      <form.Field name="fullName">
        {(field): React.JSX.Element => (
          <TextField
            label="Full name"
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={visibleFieldError(field.state.meta)}
            autoComplete="name"
            textContentType="name"
          />
        )}
      </form.Field>
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
          />
        )}
      </form.Field>
      <form.Field name="password">
        {(field): React.JSX.Element => (
          <TextField
            label="Password"
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={visibleFieldError(field.state.meta)}
            hint="At least 8 characters with upper- and lower-case letters, a number and a symbol."
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
          />
        )}
      </form.Field>
      <Button label="Create account" onPress={submit} loading={pending} />
    </AuthPage>
  );
}
