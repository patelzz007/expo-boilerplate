import { View, TouchableOpacity, Text } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "./ThemeProvider";

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { tokens } = useTheme();
  return (
    <View className="absolute bottom-6 left-4 right-4">
      <View className="flex-row items-center justify-around rounded-full px-6 py-4 shadow-lg" style={{ backgroundColor: tokens.surface }}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          // Icon mapping for tabs
          const getIcon = () => {
            if (route.name === "index") {
              return isFocused ? "home" : "home-outline";
            } else if (route.name === "details") {
              return isFocused ? "list" : "list-outline";
            } else if (route.name === "settings") {
              return isFocused ? "settings" : "settings-outline";
            }
            return "ellipse-outline";
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              className={`flex-1 items-center justify-center rounded-full px-6 py-3.5`}
              style={{ backgroundColor: isFocused ? tokens.primary : "transparent" }}>
              <View className="flex-row items-center gap-2">
                <Ionicons name={getIcon() as any} size={20} color={isFocused ? (tokens.primaryTextOn as any) : (tokens.textMuted as any)} />
                {isFocused && (
                  <Text className="text-sm font-semibold" style={{ color: tokens.primaryTextOn }}>
                    {typeof label === "string" ? label : route.name}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
