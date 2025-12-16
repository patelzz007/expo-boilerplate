import { Badge } from "@/components/Badge";
import { Banner } from "@/components/Banner";
import { Card } from "@/components/Card";
import { Cards, type CardItem } from "@/components/Cards";
import { DevPanel } from "@/components/DevPanel";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/Input";
import { ListItem } from "@/components/ListItem";
import { useMenu } from "@/components/MenuContext";
import { Skeleton } from "@/components/Skeleton";
import { useApi } from "@/hooks/useApi";
import { useDebounce } from "@/hooks/useDebounce";
import { useFlags } from "@/store/flags";
import { Ionicons } from "@expo/vector-icons";
import { useNetInfo } from "@react-native-community/netinfo";
import { keepPreviousData, UseQueryResult } from "@tanstack/react-query";
import { Href, router } from "expo-router";
import { useTheme } from "@/components/ThemeProvider";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { z } from "zod";

const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  username: z.string(),
  email: z.string(),
});

type User = z.infer<typeof userSchema>;

const BASE_URL = "https://jsonplaceholder.typicode.com/";

const statsCards: CardItem[] = [
  {
    key: "completed",
    title: "Completed",
    value: 24,
    subtitle: "Tasks finished",
    icon: "checkmark-circle",
    tone: "slate",
  },
  {
    key: "pending",
    title: "Pending",
    value: 8,
    subtitle: "Awaiting review",
    icon: "time",
    tone: "amber",
  },
];

export default function Home() {
  const { tokens, theme, setTheme, colorScheme } = useTheme();
  const api = useApi(BASE_URL);
  const { openMenu } = useMenu();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [showBanner, setShowBanner] = useState(true);
  const netInfo = useNetInfo();
  const { debugPanel, experimentalSearch } = useFlags();
  const { control: searchControl, watch: watchSearch } = useForm<{ search: string }>({
    defaultValues: { search: "" },
    mode: "onChange",
  });
  const search = watchSearch("search");
  const debouncedSearch = useDebounce(search, 400);
  const canPrev = useMemo(() => page > 1, [page]);
  const canNext = useMemo(() => true, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const usersProcedure = api.procedure({
    method: "GET",
    path: "users",
    responseSchema: z.array(userSchema),
    queryKey: (options) => ["users", options?.query?._page ?? 1, options?.query?._limit ?? 5, options?.query?.q ?? ""],
  });

  const usersQuery: UseQueryResult<{ id: number; name: string; username: string; email: string }[], Error> =
    usersProcedure.useQuery(
      {
        query: {
          _page: page,
          _limit: limit,
          ...(experimentalSearch || !debouncedSearch ? {} : { q: debouncedSearch }),
        },
      },
      { placeholderData: keepPreviousData }
    );

  const users = usersQuery.data ?? [];
  const { refetch } = usersQuery;
  const loading = usersQuery.isPending || usersQuery.isFetching;
  const error = usersQuery.error?.message ?? null;
  const isOffline = netInfo.isConnected === false;
  const displayedUsers =
    experimentalSearch && debouncedSearch
      ? users.filter((u) => {
          const term = debouncedSearch.toLowerCase();
          return (
            u.name.toLowerCase().includes(term) ||
            u.username.toLowerCase().includes(term) ||
            u.email.toLowerCase().includes(term)
          );
        })
      : users;

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
    <View className={styles.container} style={{ backgroundColor: tokens.bg }}>
      <ScrollView className="flex-1" contentContainerClassName="pb-28" showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View className="px-6 pb-10 pt-14" style={{ backgroundColor: tokens.primary }}>
          {/* Top Bar with Menu and Notification */}
          <View className="mb-6 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={openMenu}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="menu" size={28} color={tokens.primaryTextOn} />
            </TouchableOpacity>
            <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
              <Ionicons name="notifications-outline" size={24} color={tokens.primaryTextOn} />
            </View>
          </View>

          {/* Welcome Content */}
          <View>
            <Text className="font-geistBold text-3xl" style={{ color: tokens.primaryTextOn }}>Welcome Back</Text>
            <Text className="mt-2 text-sm" style={{ color: tokens.primaryTextOn, opacity: 0.7 }}>
              {"Here's what's happening today"}
            </Text>
          </View>
        </View>

        {/* Info Banner */}
        {showBanner && (
          <View className="mt-2 px-6 pb-4">
            <TouchableOpacity activeOpacity={0.9} onPress={() => setShowBanner(false)}>
              <Banner
                tone="success"
                title="Prototype ready"
                message="New UI toolkit components are live on this screen. Tap to dismiss."
              />
            </TouchableOpacity>
          </View>
        )}

        {isOffline && (
          <View className="px-6 pb-2">
            <Banner
              tone="warning"
              title="Offline mode"
              message="You are offline. Showing cached data; new requests will retry automatically when online."
            />
          </View>
        )}

        {/* Stats Cards */}
        <View className="-mt-6 px-6">
          <Cards items={statsCards} columns={2} />
        </View>

        {/* Main CTA - View Details */}
        <View className="px-6 py-8">
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/details", params: { name: "User" } })}
            className="overflow-hidden rounded-2xl shadow-lg"
            style={{ backgroundColor: tokens.surface }}>
            <View className="px-6 py-8">
              <View className="mb-4 h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}>
                <Ionicons name="grid" size={24} color={colorScheme === "dark" ? tokens.accent : tokens.primary} />
              </View>
              <Text className="font-geistBold text-xl" style={{ color: tokens.text }}>View Details</Text>
              <Text className="mt-2 text-sm" style={{ color: tokens.textMuted }}>
                Explore comprehensive insights and analytics
              </Text>
              <View className="mt-6 flex-row items-center">
                <Text className="text-sm font-semibold" style={{ color: tokens.accent }}>Learn More</Text>
                <Ionicons name="arrow-forward" size={16} color={tokens.accent} className="ml-2" />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Users Section (from API) */}
        <View className="px-6 pb-4">
          <View className="mb-2">
            <Input
              name="search"
              control={searchControl}
              label="Search Users"
              icon="search"
              placeholder="Search by name, username, or email"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-geistBold text-lg" style={{ color: tokens.text }}>Users</Text>
            <View className="flex-row items-center gap-3">
              {experimentalSearch && (
                <View className="rounded-full px-3 py-1" style={{ backgroundColor: colorScheme === 'dark' ? '#064e3b' : '#d1fae5' }}>
                  <Text className="text-xs font-semibold" style={{ color: colorScheme === 'dark' ? '#6ee7b7' : '#065f46' }}>Experimental search (local filter)</Text>
                </View>
              )}
              <TouchableOpacity
                disabled={!canPrev || loading}
                onPress={prevPage}
                className="rounded-lg px-3 py-2"
                style={{ backgroundColor: tokens.primary, opacity: (!canPrev || loading) ? 0.5 : 1 }}>
                <Text style={{ color: tokens.primaryTextOn }}>Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!canNext || loading}
                onPress={nextPage}
                className="rounded-lg px-3 py-2"
                style={{ backgroundColor: tokens.primary, opacity: (!canNext || loading) ? 0.5 : 1 }}>
                <Text style={{ color: tokens.primaryTextOn }}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm" style={{ color: tokens.textMuted }}>
              Page {page} • Limit {limit}
            </Text>
            <View className="flex-row gap-2">
              {[5, 10].map((l: number) => (
                <TouchableOpacity
                  key={l}
                  disabled={loading}
                  onPress={() => setPageSize(l)}
                  className="rounded-lg px-3 py-2"
                  style={{ backgroundColor: limit === l ? tokens.primary : tokens.border }}>
                  <Text style={{ color: limit === l ? tokens.primaryTextOn : tokens.text }}>{l}/page</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {loading && (
            <View className="gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} className="flex-row items-center rounded-xl px-4 py-4" style={{ backgroundColor: tokens.surface }}>
                  <Skeleton width={40} height={40} borderRadius={20} />
                  <View className="ml-4 flex-1 gap-2">
                    <Skeleton width="70%" height={12} borderRadius={0} />
                    <Skeleton width="50%" height={10} borderRadius={0} />
                  </View>
                  <Skeleton width={18} height={18} borderRadius={9} />
                </View>
              ))}
            </View>
          )}
          {error && <Text className="text-red-600">{error}</Text>}
          {!loading && !error && displayedUsers.length === 0 && (
            <EmptyState
              title="No users found"
              icon="people-outline"
              description="Try adjusting your search or refresh the list."
              actionLabel="Refresh"
              onAction={() => refetch()}
            />
          )}
          {!loading && !error && displayedUsers.length > 0 && (
            <View className="gap-3">
              {displayedUsers.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  onPress={() => router.push(`/user-details?id=${u.id}`)}
                  activeOpacity={0.7}
                  className="flex-row items-center rounded-xl px-4 py-4"
                  style={{ backgroundColor: tokens.surface }}>
                  <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: tokens.primary }}>
                    <Ionicons name="person" size={18} color={tokens.primaryTextOn} />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-sm font-semibold" style={{ color: tokens.text }}>{u.name}</Text>
                    <Text className="mt-0.5 text-xs" style={{ color: tokens.textMuted }}>
                      @{u.username} • {u.email}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={tokens.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* JSON Response Debug */}
          {!loading && !error && users.length > 0 && (
            <View className="mt-8 rounded-xl px-4 py-4" style={{ backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#f1f5f9' }}>
              <Text className="mb-2 text-xs font-bold" style={{ color: colorScheme === 'dark' ? '#cbd5e1' : '#475569' }}>API Response (JSON):</Text>
              <Text className="font-mono text-xs" style={{ color: colorScheme === 'dark' ? '#e2e8f0' : '#1e293b' }}>{JSON.stringify(users, null, 2)}</Text>
            </View>
          )}
        </View>

        {/* Theme Switcher */}
        <View className="px-6 pb-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="font-geistBold text-lg" style={{ color: tokens.text }}>Theme</Text>
            <View className="flex-row gap-2">
              {["light", "dark", "system"].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setTheme(opt as any)}
                  className={`rounded-lg px-3 py-2`} style={{ backgroundColor: theme === opt ? tokens.primary : tokens.border }}>
                  <Text style={{ color: theme === opt ? tokens.primaryTextOn : tokens.text }}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
        {/* Activity Section */}
        <View className="px-6 pb-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-geistBold text-lg" style={{ color: tokens.text }}>Recent Activity</Text>
            <TouchableOpacity>
              <Text className="text-sm font-semibold" style={{ color: tokens.textMuted }}>See All</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-3">
            <ActivityItem icon="document-text" title="New report available" time="2 hours ago" />
            <ActivityItem icon="people" title="Team meeting scheduled" time="5 hours ago" />
            <ActivityItem icon="trophy" title="Milestone achieved" time="1 day ago" />
          </View>
        </View>

        {/* UI Toolkit Demo */}
        <View className="px-6 pb-4">
          <Text className="mb-4 font-geistBold text-lg" style={{ color: tokens.text }}>UI Toolkit Demo</Text>
          <Card title="Team" subtitle="Reusable ListItem, Badge, Card" icon="people" tone="blue">
            <ListItem
              title="Ava Dean"
              subtitle="Product Design"
              description="Handing off new flows"
              badgeLabel="Online"
              badgeTone="emerald"
              icon="person"
              rightElement={<Badge label="Pro" tone="amber" pill={true} />}
            />
          </Card>
          <Card title="Reminder" subtitle="Banner and toast-style confirmations" icon="notifications" tone="amber">
            <Text className="text-sm" style={{ color: tokens.textMuted }}>Banners are great for inline confirmations or warnings.</Text>
          </Card>
          {debugPanel && (
            <View className="mt-4">
              <DevPanel title={""} showFlags={false} />
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View className="px-6 pb-4">
          <Text className="mb-4 font-geistBold text-lg" style={{ color: tokens.text }}>Quick Actions</Text>

          <View className="-mx-2 flex-row flex-wrap">
            <View className="mb-4 w-1/2 px-2">
              <ActionCard icon="person" label="Profile" />
            </View>
            <View className="mb-4 w-1/2 px-2">
              <ActionCard icon="settings" label="Settings" />
            </View>
            <View className="mb-4 w-1/2 px-2">
              <ActionCard icon="notifications" label="Alerts" />
            </View>
            <View className="mb-4 w-1/2 px-2">
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
}

function ActivityItem({ icon, title, time }: ActivityItemProps) {
  const { tokens } = useTheme();
  return (
    <View className="flex-row items-center rounded-xl px-4 py-4" style={{ backgroundColor: tokens.surface }}>
      <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: tokens.primary }}>
        <Ionicons name={icon} size={18} color={tokens.primaryTextOn} />
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-sm font-semibold" style={{ color: tokens.text }}>{title}</Text>
        <Text className="mt-0.5 text-xs" style={{ color: tokens.textMuted }}>{time}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={tokens.textMuted} />
    </View>
  );
}

interface ActionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

function ActionCard({ icon, label }: ActionCardProps) {
  const { tokens } = useTheme();
  return (
    <TouchableOpacity 
      className="items-center rounded-xl px-4 py-6"
      style={{ 
        backgroundColor: tokens.surface, 
        borderWidth: 1, 
        borderColor: tokens.border 
      }}>
      <View 
        className="mb-3 h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: tokens.primary }}>
        <Ionicons name={icon} size={22} color={tokens.primaryTextOn} />
      </View>
      <Text className="text-sm font-semibold" style={{ color: tokens.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = {
  container: "flex flex-1",
};
