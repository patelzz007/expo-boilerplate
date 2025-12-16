import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { z, treeifyError } from "zod";
import { useFlags } from "@/store/flags";

const devPanelPropsSchema = z.object({
  title: z.string().default("Dev / Debug Panel"),
  showFlags: z.boolean().default(true),
});

type DevPanelProps = z.infer<typeof devPanelPropsSchema>;

export function DevPanel(rawProps: DevPanelProps = { title: "", showFlags: false }) {
  const parsed = devPanelPropsSchema.safeParse(rawProps);
  if (!parsed.success) {
    console.warn("DevPanel validation failed", z.treeifyError(parsed.error));
    return null;
  }
  const { title, showFlags } = parsed.data;
  const queryClient = useQueryClient();
  const [version, setVersion] = useState(0);
  const { newUI, debugPanel, experimentalSearch, toggleFlag } = useFlags();

  useEffect(() => {
    let mounted = true;
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      if (!mounted) return;
      requestAnimationFrame(() => setVersion((v: number) => v + 1));
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [queryClient]);

  const stats = useMemo(() => {
    const queries = queryClient.getQueryCache().getAll();
    const total = queries.length;
    const fetching = queries.filter((q) => q.state.fetchStatus === "fetching").length;
    const invalidated = queries.filter((q) => q.state.isInvalidated).length;
    const withData = queries.filter((q) => q.state.data !== undefined).length;
    return { total, fetching, invalidated, withData };
  }, [queryClient, version]);

  return (
    <View className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <Text className="font-geistBold text-base text-slate-900">{title}</Text>
      <Text className="mt-1 text-xs text-slate-500">React Query cache + feature flags</Text>

      <View className="mt-3 rounded-xl bg-slate-50 p-3">
        <Text className="text-xs font-semibold text-slate-700">Query Cache</Text>
        <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
          <Stat label="Total" value={stats.total} />
          <Stat label="Fetching" value={stats.fetching} />
          <Stat label="Invalidated" value={stats.invalidated} />
          <Stat label="With Data" value={stats.withData} />
        </View>
      </View>

      {showFlags && (
        <View className="mt-4 rounded-xl bg-slate-50 p-3">
          <Text className="text-xs font-semibold text-slate-700">Feature Flags</Text>
          <FlagRow label="New UI" value={newUI} onToggle={() => toggleFlag("newUI")} />
          <FlagRow label="Debug Panel" value={debugPanel} onToggle={() => toggleFlag("debugPanel")} />
          <FlagRow
            label="Experimental Search"
            value={experimentalSearch}
            onToggle={() => toggleFlag("experimentalSearch")}
          />
        </View>
      )}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-row items-center gap-1">
      <Text className="text-xs text-slate-500">{label}:</Text>
      <Text className="text-xs font-semibold text-slate-900">{value}</Text>
    </View>
  );
}

function FlagRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <View className="mt-2 flex-row items-center justify-between">
      <Text className="text-sm text-slate-800">{label}</Text>
      <Switch value={value} onValueChange={onToggle} />
    </View>
  );
}
