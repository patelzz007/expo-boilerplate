import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "./ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  children: React.ReactNode;
  onRetry?: () => void;
  // injected by Themed wrapper
  tokens?: {
    bg: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    primary: string;
    primaryTextOn: string;
    accent: string;
  };
}

interface State {
  hasError: boolean;
  error?: unknown;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("ErrorBoundary caught", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      const tokens = this.props.tokens;
      return (
        <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: tokens?.bg ?? "#ffffff" }}>
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: "#fee2e2" }}>
            <Ionicons name="alert-circle" size={28} color="#ef4444" />
          </View>
          <Text className="text-lg font-semibold" style={{ color: tokens?.text ?? "#0f172a" }}>Something went wrong</Text>
          <Text className="mt-2 text-center text-sm" style={{ color: tokens?.textMuted ?? "#64748b" }}>
            An unexpected error occurred. You can retry or restart the app.
          </Text>
          <View className="mt-6 flex-row gap-3">
            <TouchableOpacity onPress={this.handleRetry} className="rounded-lg px-4 py-3" style={{ backgroundColor: tokens?.primary ?? "#0f172a" }}>
              <Text style={{ color: tokens?.primaryTextOn ?? "#ffffff" }}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

export function ThemedErrorBoundary({ children, onRetry }: { children: React.ReactNode; onRetry?: () => void }) {
  const { tokens } = useTheme();
  return (
    <ErrorBoundary tokens={tokens} onRetry={onRetry}>
      {children}
    </ErrorBoundary>
  );
}
