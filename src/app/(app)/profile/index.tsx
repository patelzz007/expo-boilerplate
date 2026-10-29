// ============================================
// Profile (§10.8) — the same fields as the web profile
// ============================================
// The signed-in user's own profile, edited with the shared
// OwnProfileEditableFieldsSchema. The edits live on this device only (no backend):
// a save keeps them in this screen's state. Under the editor, a "Dates (demo)"
// card shows the date pickers (date of birth, available days) — demo only.

import { useForm } from "@tanstack/react-form";
import { OwnProfileEditableFieldsSchema } from "@/shared";
import * as React from "react";
import { View } from "react-native";
import type { z } from "zod";

import { Avatar } from "@/ui/components/avatar";
import { Button } from "@/ui/components/button";
import { Card } from "@/ui/components/card";
import { DetailList } from "@/ui/components/detail-list";
import { TextField } from "@/ui/components/text-field";
import { Screen } from "../../../components/screen";
import { DemoDatesSection } from "../../../contexts/identity";
import { useSessionUser } from "../../../features/session/facade";
import { useToast } from "../../../features/toast/facade";
import { visibleFieldError } from "../../../lib/form";

export const PROFILE_SAVED_MESSAGE = "Profile saved.";

type OwnProfileEditableFields = z.output<typeof OwnProfileEditableFieldsSchema>;

/** The profile as this screen holds it: the stored values and how many times they were saved. */
interface LocalProfile {
  readonly email: string;
  readonly fullName: string;
  /** Bumped by every save, so the editor restarts from the stored values (its key). */
  readonly version: number;
}

const FIRST_VERSION = 1;

export default function ProfileScreen(): React.JSX.Element {
  const user = useSessionUser();
  const [profile, setProfile] = React.useState<LocalProfile | null>(
    user === null ? null : { email: user.email, fullName: user.fullName, version: FIRST_VERSION }
  );

  const save = React.useCallback((fields: OwnProfileEditableFields): void => {
    setProfile((current: LocalProfile | null): LocalProfile | null =>
      current === null ? null : { ...current, ...fields, version: current.version + 1 }
    );
  }, []);

  return (
    <Screen>
      {/* Keyed by version: the form restarts from the stored values after every save. */}
      {profile === null ? null : <ProfileEditor key={profile.version} profile={profile} onSave={save} />}
      {profile === null ? null : <DemoDatesSection />}
    </Screen>
  );
}

interface ProfileEditorProps {
  readonly profile: LocalProfile;
  readonly onSave: (fields: OwnProfileEditableFields) => void;
}

function ProfileEditor({ profile, onSave }: ProfileEditorProps): React.JSX.Element {
  const toast = useToast();

  const form = useForm({
    defaultValues: { fullName: profile.fullName },
    validators: { onChange: OwnProfileEditableFieldsSchema },
    onSubmit: ({ value }): void => {
      onSave(OwnProfileEditableFieldsSchema.parse(value));
      toast.success(PROFILE_SAVED_MESSAGE);
    },
  });
  const submit = React.useCallback((): void => {
    form.handleSubmit().catch((error: unknown): void => {
      console.error("Saving the profile failed", error);
    });
  }, [form]);

  return (
    <>
      <Card>
        <View className="flex-row items-center gap-4">
          <Avatar name={profile.fullName} imageUrl={null} />
          <View className="flex-1">
            <DetailList items={[{ label: "Email", value: profile.email }]} />
          </View>
        </View>
      </Card>
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
      <Button label="Save changes" onPress={submit} />
    </>
  );
}
