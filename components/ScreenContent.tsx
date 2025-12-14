import React from "react";
import { Text, View } from "react-native";
import { EditScreenInfo } from "./EditScreenInfo";

type ScreenContentProps = {
  title: string;
  path: string;
  children?: React.ReactNode;
};

export const ScreenContent = ({ title, path, children }: ScreenContentProps) => {
  return (
    <View className={`items-center bg-white`}>
      <Text className={`font-bold text-xl`}>{title}</Text>
      <View className={`my-7 h-[1px] w-4/5 bg-gray-200`} />
      <EditScreenInfo path={path} />
      {children}
    </View>
  );
};
