import { SafeAreaView } from "react-native";
import { z } from "zod";
import React from "react";

const containerPropsSchema = z.object({
  children: z.custom<React.ReactNode>(),
});

type ContainerProps = z.infer<typeof containerPropsSchema>;

export const Container = (rawProps: ContainerProps) => {
  const parsed = containerPropsSchema.safeParse(rawProps);
  if (!parsed.success) {
    console.warn("Container validation failed", z.treeifyError(parsed.error));
    return null;
  }
  const { children } = parsed.data;
  return <SafeAreaView className={styles.container}>{children}</SafeAreaView>;
};

const styles = {
  container: "flex flex-1 mx-6 mt-6 mb-24",
};
