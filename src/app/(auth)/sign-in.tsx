// ============================================
// Sign in (§10.1) — email and password, with the shared LoginSchema
// ============================================
// UI only: there is no API, so a valid form starts a demo session on this device; the root guard then
// moves on to the app.

import { useForm } from "@tanstack/react-form";
import { LoginSchema, type LoginInput } from "@/shared";
import { useRouter } from "expo-router";
import * as React from "react";
import { View } from "react-native";

import { AuthPage } from "../../components/auth-page";
import { Button } from "@/ui/components/button";
import { TextField } from "@/ui/components/text-field";
import { QuickSignIn, type QuickSignInChoice } from "../../components/quick-sign-in";
import { TextLink } from "@/ui/components/text-link";
import { type DemoAccount, useDemoAccounts } from "../../contexts/identity/auth/demo-accounts";
import { fullNameFromEmail, simulateRequest } from "../../contexts/identity/auth/demo-sign-in";
import { useSessionCommands } from "../../features/session/facade";
import { visibleFieldError } from "../../lib/form";
import { ROUTES } from "../../runtime/routes";

const EMPTY_LOGIN: LoginInput = { email: "", password: "" };

export default function SignInScreen(): React.JSX.Element {
  const router = useRouter();
  const session = useSessionCommands();
  const [pending, setPending] = React.useState(false);
  const demoAccounts = useDemoAccounts();

  const form = useForm({
    defaultValues: EMPTY_LOGIN,
    validators: { onChange: LoginSchema },
    onSubmit: async ({ value }): Promise<void> => {
      const input = LoginSchema.parse(value);
      setPending(true);
      await simulateRequest();
      const account = demoAccounts.find((candidate: DemoAccount): boolean => candidate.email === input.email);
      session.signIn({ fullName: account?.fullName ?? fullNameFromEmail(input.email), email: input.email });
    },
  });

  const submit = React.useCallback((): void => {
    void form.handleSubmit();
  }, [form]);
  /** A demo login: fill the fields so the user sees what is sent, then sign in — as the web does. */
  const signInAsDemo = React.useCallback(
    (email: string): void => {
      const account = demoAccounts.find((candidate: DemoAccount): boolean => candidate.email === email);
      if (account === undefined) {
        return;
      }
      form.setFieldValue("email", account.email);
      form.setFieldValue("password", account.password);
      void form.handleSubmit();
    },
    [demoAccounts, form]
  );
  const demoChoices = React.useMemo(
    (): readonly QuickSignInChoice[] =>
      demoAccounts.map((account: DemoAccount): QuickSignInChoice => ({ key: account.email, label: account.label })),
    [demoAccounts]
  );
  const openForgotPassword = React.useCallback((): void => {
    router.push(ROUTES.forgotPassword);
  }, [router]);
  const openSignUp = React.useCallback((): void => {
    router.push(ROUTES.signUp);
  }, [router]);

  return (
    <AuthPage
      title="Welcome back"
      description="Sign in to continue."
      footer={<TextLink leadIn="Don't have an account?" label="Create one" onPress={openSignUp} />}>
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
            returnKeyType="next"
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
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
        )}
      </form.Field>
      <View className="-mt-2 items-end">
        <TextLink label="Forgot password?" onPress={openForgotPassword} />
      </View>
      <Button label="Sign in" onPress={submit} loading={pending} />
      {demoChoices.length === 0 ? null : (
        <QuickSignIn
          title="Quick sign-in (development)"
          choices={demoChoices}
          onSelect={signInAsDemo}
          disabled={pending}
          testID="quick-sign-in"
        />
      )}
    </AuthPage>
  );
}
