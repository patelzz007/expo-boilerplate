import { Redirect } from "expo-router";

export default function Index() {
  // You can add authentication check here
  const isAuthenticated = false; // Change this based on your auth logic

  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  return <Redirect href="/onboarding" />;
}
