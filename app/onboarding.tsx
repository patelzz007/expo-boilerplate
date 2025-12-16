import { Button } from "@/components/Button";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { FlatList, ListRenderItem, Text, useWindowDimensions, View, ViewToken } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/components/ThemeProvider";

interface OnboardingSlide {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SLIDES: OnboardingSlide[] = [
  {
    key: "clarity",
    title: "Clarity first",
    description: "A clean, distraction-free experience designed to keep your focus where it matters most.",
    icon: "contrast-outline",
  },
  {
    key: "speed",
    title: "Move fast",
    description: "Swipe effortlessly through key moments and stay in control from the very first interaction.",
    icon: "flash-outline",
  },
  {
    key: "confidence",
    title: "Start confidently",
    description: "Secure, intentional, and built to support your workflow from day one.",
    icon: "shield-checkmark-outline",
  },
];

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isLast = useMemo(() => currentIndex === SLIDES.length - 1, [currentIndex]);
  const { tokens } = useTheme();

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
    const nextIndex = viewableItems[0]?.index;
    
    if (typeof nextIndex === "number") setCurrentIndex(nextIndex);
  });

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 });

  const handleNext = () => {
    if (isLast) {
      router.replace("/(auth)/login");
      return;
    }

    listRef.current?.scrollToIndex({
      index: currentIndex + 1,
      animated: true,
    });
  };

  const handleSkip = () => router.replace("/(auth)/login");

  const getIconColor = (key: string): string => {
    const colors: Record<string, string> = {
      clarity: "#3b82f6",
      speed: "#ef4444",
      confidence: "#10b981",
    };
    return colors[key] || tokens.primary;
  };

  const renderItem: ListRenderItem<OnboardingSlide> = ({ item }) => (
    <View style={{ width }} className="flex-1 items-center justify-center px-8">
      <View className="mb-8 items-center justify-center">
        <View className="h-48 w-48 items-center justify-center" style={{ backgroundColor: tokens.surface }}>
          <Ionicons name={item.icon} size={96} color={getIconColor(item.key)} />
        </View>
      </View>

      {/* Text */}
      <View className="items-center px-4">
        <Text className="font-geistBold mb-4 text-center text-3xl" style={{ color: tokens.text }}>{item.title}</Text>
        <Text className="font-geist text-center text-base leading-6" style={{ color: tokens.textMuted }}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: tokens.bg }}>
      <StatusBar style="auto" />
      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
      />

      {/* Footer */}
      <View className="px-8 pb-10">
        {/* Dotted indicator */}
        <View className="mb-8 flex-row items-center justify-center gap-2">
          {SLIDES.map((_, idx) => {
            const active = idx === currentIndex;
            return (
              <View
                key={idx}
                className={`h-2 rounded-full ${active ? "w-6" : "w-2"}`}
                style={{ backgroundColor: active ? tokens.primary : tokens.border }}
              />
            );
          })}
        </View>

        {/* Primary CTA */}
        <Button onPress={handleNext} className="h-14 w-full items-center justify-center rounded-2xl" style={{ backgroundColor: tokens.primary }}>
          <Text className="font-geistBold text-base" style={{ color: tokens.primaryTextOn }}>{isLast ? "Get started" : "Continue"}</Text>
        </Button>

        {/* Secondary CTA */}
        {!isLast && (
          <Button variant="ghost" onPress={handleSkip} className="mt-4 h-12 w-full items-center justify-center">
            <Text className="text-md font-groteskBold" style={{ color: tokens.textMuted }}>Skip for now</Text>
          </Button>
        )}
      </View>
    </View>
  );
}
