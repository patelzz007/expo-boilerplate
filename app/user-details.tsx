import { useApi } from "@/hooks/useApi";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { UserCircle2 } from "lucide-react-native";
import { useEffect } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { z } from "zod";

// Extended user details schema (matches JSONPlaceholder API)
const userDetailsSchema = z.object({
  id: z.number(),
  name: z.string(),
  username: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  website: z.string().optional(),
  company: z
    .object({
      name: z.string(),
      catchPhrase: z.string().optional(),
      bs: z.string().optional(),
    })
    .optional(),
  address: z
    .object({
      street: z.string(),
      city: z.string(),
      zipcode: z.string().optional(),
    })
    .optional(),
});

type UserDetails = z.infer<typeof userDetailsSchema>;

export default function UserDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const api = useApi("https://jsonplaceholder.typicode.com/");

  // Create procedure for fetching single user
  const userProcedure = api.procedure({
    method: "GET",
    path: `users/${id}`,
    responseSchema: userDetailsSchema,
    queryKey: ["user", id],
  });

  const userQuery = userProcedure.useQuery();

  useEffect(() => {
    // Prefetch to ensure we have data
  }, [id]);

  const user = userQuery.data;
  const loading = userQuery.isPending;
  const error = userQuery.error?.message;

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-24">
        {/* Header */}
        <View className="bg-slate-900 px-6 pb-20 pt-12">
          <View className="flex-row items-center pt-12">
            <TouchableOpacity
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View className="flex-1 items-center">
              <Text className="font-geistBold text-2xl text-white">User Details</Text>
            </View>
            <View className="w-10" />
          </View>
        </View>

        {loading && (
          <View className="mt-12 items-center justify-center">
            <ActivityIndicator size="large" />
          </View>
        )}

        {error && (
          <View className="m-6 rounded-lg bg-red-50 px-4 py-3">
            <Text className="text-sm font-semibold text-red-600">Error loading user</Text>
            <Text className="mt-1 text-xs text-red-500">{error}</Text>
          </View>
        )}

        {!loading && !error && user && (
          <>
            {/* User Profile Card */}
            <View className="mx-6 -mt-10 rounded-2xl bg-white px-6 py-6 shadow-lg">
              <View className="items-center">
                <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-slate-700">
                  <UserCircle2 size={80} color="black" />
                </View>
                <Text className="text-center font-geistBold text-2xl text-slate-900">{user.name}</Text>
                <Text className="mt-1 text-sm text-slate-500">@{user.username}</Text>
              </View>
            </View>

            {/* JSON Response Debug */}
            <View className="mx-6 mt-6 rounded-xl bg-slate-900 px-4 py-4">
              <Text className="mb-2 text-xs font-bold text-slate-300">API Response (JSON):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Text className="font-mono text-xs text-slate-100">{JSON.stringify(user, null, 2)}</Text>
              </ScrollView>
            </View>

            {/* Contact Information */}
            <View className="mx-6 mt-6">
              <Text className="mb-4 font-geistBold text-lg text-slate-900">Contact Information</Text>

              <InfoItem
                icon="mail"
                label="Email"
                value={user.email}
                onPress={() => {
                  /* Could implement email sharing */
                }}
              />

              {user.phone && (
                <InfoItem
                  icon="call"
                  label="Phone"
                  value={user.phone}
                  onPress={() => {
                    /* Could implement phone call */
                  }}
                />
              )}

              {user.website && (
                <InfoItem
                  icon="globe"
                  label="Website"
                  value={user.website}
                  onPress={() => {
                    /* Could implement web link */
                  }}
                />
              )}
            </View>

            {/* Company Information */}
            {user.company && (
              <View className="mx-6 mt-6">
                <Text className="mb-4 font-geistBold text-lg text-slate-900">Company</Text>

                <View className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-4">
                  <View className="mb-3 flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-900">
                      <Ionicons name="briefcase" size={18} color="#ffffff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-slate-900">{user.company.name}</Text>
                      {user.company.catchPhrase && (
                        <Text className="mt-0.5 text-xs text-slate-600">{user.company.catchPhrase}</Text>
                      )}
                    </View>
                  </View>
                  {user.company.bs && <Text className="text-xs italic text-slate-600">"{user.company.bs}"</Text>}
                </View>
              </View>
            )}

            {/* Address Information */}
            {user.address && (
              <View className="mx-6 mt-6">
                <Text className="mb-4 font-geistBold text-lg text-slate-900">Address</Text>

                <View className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-4">
                  <View className="mb-3 flex-row gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-900">
                      <Ionicons name="location" size={18} color="#ffffff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-slate-900">{user.address.street}</Text>
                      <Text className="mt-1 text-sm text-slate-700">
                        {user.address.city}
                        {user.address.zipcode && `, ${user.address.zipcode}`}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Fixed Action Buttons */}
      {!loading && !error && user && (
        <View className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-6 py-6">
          <View className="flex-row gap-3">
            <TouchableOpacity className="flex-1 rounded-lg bg-slate-900 px-4 py-3 active:bg-slate-800">
              <View className="flex-row items-center justify-center gap-2">
                <Ionicons name="mail" size={18} color="#ffffff" />
                <Text className="font-semibold text-white">Contact</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 rounded-lg border border-slate-900 px-4 py-3 active:bg-slate-50">
              <View className="flex-row items-center justify-center gap-2">
                <Ionicons name="heart-outline" size={18} color="#0f172a" />
                <Text className="font-semibold text-slate-900">Save</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

interface InfoItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}

function InfoItem({ icon, label, value, onPress }: InfoItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-xl bg-slate-50 px-4 py-3 active:bg-slate-100">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-900">
        <Ionicons name={icon} size={18} color="#ffffff" />
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-xs font-semibold text-slate-500">{label}</Text>
        <Text className="mt-1 text-sm font-medium text-slate-900">{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
    </TouchableOpacity>
  );
}
