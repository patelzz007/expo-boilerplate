// ============================================
// Configuration error (§10.14)
// ============================================
// The environment failed validation: names what is wrong and shows an example
// value — never the configured value (EXPO_PUBLIC_* holds no secret, but the
// screen prints none regardless). In development it points to the README.

import * as React from "react";

import { Alert } from "@/ui/components/alert";
import { Card } from "@/ui/components/card";
import { Screen } from "../components/screen";
import { CodeText, MutedText } from "@/ui/components/text";
import { useConfigIssue } from "../runtime/runtime-context";

/** Where the variables are explained (development builds only). */
export const CONFIG_HELP_PATH = "README.md → Configuration";

export default function ConfigErrorScreen(): React.JSX.Element {
  const issue = useConfigIssue();
  return (
    <Screen
      title="The app is not configured"
      description="This build cannot start until the configuration below is fixed.">
      {issue === null ? (
        <Alert tone="error" message="The configuration could not be read." />
      ) : (
        <Card title={issue.subject}>
          <Alert tone="error" message={`${issue.subject} ${issue.message}.`} />
          <MutedText>Example</MutedText>
          <CodeText selectable>{issue.example}</CodeText>
        </Card>
      )}
      {__DEV__ ? <MutedText>{`Set the value in .env and restart Expo. See ${CONFIG_HELP_PATH}.`}</MutedText> : null}
    </Screen>
  );
}
