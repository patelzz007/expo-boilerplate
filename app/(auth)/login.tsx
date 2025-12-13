import { AuthLayout } from "@/components/AuthLayout";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;

    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Login with:", email, password);
    setIsLoading(false);
    router.replace("/(tabs)");
  };

  const handleQuickLogin = () => {
    // Fill in demo credentials
    setEmail("demo@example.com");
    setPassword("password123");
  };

  const handleSocialLogin = (provider: string) => {
    // Handle social login
    console.log("Login with:", provider);
    router.replace("/(tabs)");
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to continue" showLogo={true}>
      <View className="py-8">
        {/* Email Input */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-semibold text-slate-900">Email Address</Text>
          <View className="flex-row items-center rounded-xl border border-gray-200 bg-slate-50 px-4">
            <Ionicons name="mail-outline" size={20} color="#64748b" />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              className="ml-3 flex-1 py-4 text-base text-slate-900"
            />
          </View>
        </View>

        {/* Password Input */}
        <View className="mb-4">
          <Text className="mb-2 text-sm font-semibold text-slate-900">Password</Text>
          <View className="flex-row items-center rounded-xl border border-gray-200 bg-slate-50 px-4">
            <Ionicons name="lock-closed-outline" size={20} color="#64748b" />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showPassword}
              className="ml-3 flex-1 py-4 text-base text-slate-900"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Forgot Password */}
        <TouchableOpacity className="mb-8 self-end">
          <Text className="text-sm font-semibold text-slate-900">Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={isLoading || !email || !password}
          className={`mb-3 rounded-xl py-4 shadow-lg ${
            isLoading || !email || !password ? "bg-slate-400" : "bg-slate-900"
          }`}>
          <View className="flex-row items-center justify-center gap-2">
            {isLoading && (
              <View className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            <Text className="text-center text-base font-bold text-white">
              {isLoading ? "Signing In..." : "Sign In"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Quick Login Button */}
        <TouchableOpacity
          onPress={handleQuickLogin}
          className="mb-8 rounded-xl border-2 border-slate-900 bg-white py-4">
          <View className="flex-row items-center justify-center gap-2">
            <Ionicons name="flash" size={18} color="#0f172a" />
            <Text className="text-center text-base font-bold text-slate-900">Quick Login</Text>
          </View>
        </TouchableOpacity>

        {/* Divider */}
        <View className="my-6 flex-row items-center">
          <View className="h-px flex-1 bg-gray-200" />
          <Text className="px-4 text-sm text-slate-500">or continue with</Text>
          <View className="h-px flex-1 bg-gray-200" />
        </View>

        {/* Social Login */}
        <View className="mb-4 gap-3">
          <TouchableOpacity
            onPress={() => handleSocialLogin("Google")}
            className="flex-row items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-4 shadow-sm">
            <Ionicons name="logo-google" size={22} color="#0f172a" />
            <Text className="text-base font-semibold text-slate-900">Continue with Google</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleSocialLogin("Apple")}
            className="flex-row items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-4 shadow-sm">
            <Ionicons name="logo-apple" size={22} color="#0f172a" />
            <Text className="text-base font-semibold text-slate-900">Continue with Apple</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleSocialLogin("Facebook")}
            className="flex-row items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-4 shadow-sm">
            <Ionicons name="logo-facebook" size={22} color="#0f172a" />
            <Text className="text-base font-semibold text-slate-900">Continue with Facebook</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Up Link */}
      <View className="flex-row items-center justify-center pt-4">
        <Text className="text-sm text-slate-600">{"Don't have an account? "}</Text>
        <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
          <Text className="text-sm font-bold text-slate-900">Sign Up</Text>
        </TouchableOpacity>
      </View>
    </AuthLayout>
  );
}
