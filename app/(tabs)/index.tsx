import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";

import { CustomHeader } from "@/components/CustomHeader";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
}

const BASE_URL = "https://jsonplaceholder.typicode.com/";

export default function Home() {
  const api = useApi(BASE_URL);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const canPrev = useMemo(() => page > 1, [page]);
  const canNext = useMemo(() => true, []);

  const usersQuery = api.useQuery<User[]>(
    ["users", page, limit],
    "users",
    { query: { _page: page, _limit: limit } },
    { placeholderData: keepPreviousData }
  );

  const users = usersQuery.data ?? [];
  const loading = usersQuery.isPending || usersQuery.isFetching;
  const error = usersQuery.error?.message ?? null;

  // console.log("Users Query:", usersQuery);

  function nextPage() {
    setPage((p) => p + 1);
  }

  function prevPage() {
    setPage((p) => Math.max(1, p - 1));
  }

  function setPageSize(newLimit: number) {
    setLimit(newLimit);
    setPage(1);
  }
  return (
    <View className={styles.container}>
      <CustomHeader title="Home" />
      <ScrollView className="flex-1" contentContainerClassName="pb-28" showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View className="bg-slate-900 px-6 py-10">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-3xl font-bold text-white">Welcome Back</Text>
              <Text className="mt-2 text-sm text-white/60">{"Here's what's happening today"}</Text>
            </View>
            <View className="h-14 w-14 items-center justify-center rounded-full bg-white/10">
              <Ionicons name="notifications-outline" size={24} color="#ffffff" />
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View className="-mt-6 px-6">
          <View className="overflow-hidden rounded-2xl bg-white shadow-lg">
            <View className="flex-row">
              <View className="flex-1 border-r border-gray-100 px-6 py-6">
                <View className="mb-3 h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
                  <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                </View>
                <Text className="text-2xl font-bold text-slate-900">24</Text>
                <Text className="mt-1 text-xs font-medium text-slate-500">Completed</Text>
              </View>
              <View className="flex-1 px-6 py-6">
                <View className="mb-3 h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
                  <Ionicons name="time" size={20} color="#ffffff" />
                </View>
                <Text className="text-2xl font-bold text-slate-900">8</Text>
                <Text className="mt-1 text-xs font-medium text-slate-500">Pending</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Main CTA - View Details */}
        <View className="px-6 py-8">
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/details", params: { name: "User" } })}
            className="overflow-hidden rounded-2xl bg-slate-900 shadow-lg">
            <View className="px-6 py-8">
              <View className="mb-4 h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                <Ionicons name="grid" size={24} color="#ffffff" />
              </View>
              <Text className="text-xl font-bold text-white">View Details</Text>
              <Text className="mt-2 text-sm text-white/70">Explore comprehensive insights and analytics</Text>
              <View className="mt-6 flex-row items-center">
                <Text className="text-sm font-semibold text-white">Learn More</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" className="ml-2" />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Users Section (from API) */}
        <View className="px-6 pb-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-slate-900">Users</Text>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                disabled={!canPrev || loading}
                onPress={prevPage}
                className="rounded-lg bg-slate-900 px-3 py-2 opacity-100">
                <Text className="text-white">Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!canNext || loading}
                onPress={nextPage}
                className="rounded-lg bg-slate-900 px-3 py-2">
                <Text className="text-white">Next</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm text-slate-600">
              Page {page} • Limit {limit}
            </Text>
            <View className="flex-row gap-2">
              {[5, 10].map((l) => (
                <TouchableOpacity
                  key={l}
                  disabled={loading}
                  onPress={() => setPageSize(l)}
                  className={`rounded-lg px-3 py-2 ${limit === l ? "bg-slate-900" : "bg-slate-200"}`}>
                  <Text className={limit === l ? "text-white" : "text-slate-900"}>{l}/page</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {loading && (
            <View className="items-center py-6">
              <ActivityIndicator />
            </View>
          )}
          {error && <Text className="text-red-600">{error}</Text>}
          {!loading && !error && (
            <View className="gap-3">
              {users.map((u) => (
                <View key={u.id} className="flex-row items-center rounded-xl bg-slate-50 px-4 py-4">
                  <View className={`h-10 w-10 items-center justify-center rounded-full bg-slate-900`}>
                    <Ionicons name="person" size={18} color="#ffffff" />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-sm font-semibold text-slate-900">{u.name}</Text>
                    <Text className="mt-0.5 text-xs text-slate-500">
                      @{u.username} • {u.email}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Activity Section */}
        <View className="px-6 pb-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-slate-900">Recent Activity</Text>
            <TouchableOpacity>
              <Text className="text-sm font-semibold text-slate-600">See All</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-3">
            <ActivityItem icon="document-text" title="New report available" time="2 hours ago" iconBg="bg-slate-900" />
            <ActivityItem icon="people" title="Team meeting scheduled" time="5 hours ago" iconBg="bg-slate-700" />
            <ActivityItem icon="trophy" title="Milestone achieved" time="1 day ago" iconBg="bg-slate-500" />
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-6 pb-4">
          <Text className="mb-4 text-lg font-bold text-slate-900">Quick Actions</Text>

          <View className="-mx-2 flex-row flex-wrap">
            <View className="w-1/2 px-2">
              <ActionCard icon="person" label="Profile" />
            </View>
            <View className="w-1/2 px-2">
              <ActionCard icon="settings" label="Settings" />
            </View>
            <View className="w-1/2 px-2">
              <ActionCard icon="notifications" label="Alerts" />
            </View>
            <View className="w-1/2 px-2">
              <ActionCard icon="help-circle" label="Help" />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

interface ActivityItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  time: string;
  iconBg: string;
}

function ActivityItem({ icon, title, time, iconBg }: ActivityItemProps) {
  return (
    <View className="flex-row items-center rounded-xl bg-slate-50 px-4 py-4">
      <View className={`h-10 w-10 items-center justify-center rounded-full ${iconBg}`}>
        <Ionicons name={icon} size={18} color="#ffffff" />
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-sm font-semibold text-slate-900">{title}</Text>
        <Text className="mt-0.5 text-xs text-slate-500">{time}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
    </View>
  );
}

interface ActionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

function ActionCard({ icon, label }: ActionCardProps) {
  return (
    <TouchableOpacity className="items-center rounded-xl border border-gray-200 bg-white px-4 py-6 shadow-sm">
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-xl bg-slate-900">
        <Ionicons name={icon} size={22} color="#ffffff" />
      </View>
      <Text className="text-sm font-semibold text-slate-900">{label}</Text>
    </TouchableOpacity>
  );
}

const styles = {
  container: "flex flex-1 bg-white",
};
