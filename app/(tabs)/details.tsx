import { ScrollView, View } from "react-native";

import { useLocalSearchParams } from "expo-router";

import { Container } from "@/components/Container";
import { ScreenContent } from "@/components/ScreenContent";
import { CustomHeader } from "@/components/CustomHeader";

export default function Details() {
  const { name } = useLocalSearchParams();

  return (
    <View className={styles.container}>
      <CustomHeader title="Details" />
      <ScrollView className="flex-1" contentContainerClassName="pb-6 pt-4" showsVerticalScrollIndicator={false}>
        <Container>
          <ScreenContent path="screens/details.tsx" title={`Showing details for user ${name}`} />
        </Container>
      </ScrollView>
    </View>
  );
}

const styles = {
  container: "flex flex-1 bg-white",
};
