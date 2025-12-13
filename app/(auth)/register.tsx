import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { AuthLayout } from "@/components/AuthLayout";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!agreedToTerms) return;

    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Register with:", fullName, email, password);
    setIsLoading(false);
    router.replace("/(tabs)");
  };

  const handleSocialLogin = (provider: string) => {
    console.log("Sign up with:", provider);
    router.replace("/(tabs)");
  };

  return (
    <AuthLayout title="Get Started" subtitle="Create your account to continue" showLogo={true} showBackButton={true}>
      <View className="pb-8">
        {/* Full Name Input */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-semibold text-slate-900">Full Name</Text>
          <View className="flex-row items-center rounded-xl border border-gray-200 bg-slate-50 px-4">
            <Ionicons name="person-outline" size={20} color="#64748b" />
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
              className="ml-3 flex-1 py-4 text-base text-slate-900"
            />
          </View>
        </View>

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
        <View className="mb-6">
          <Text className="mb-2 text-sm font-semibold text-slate-900">Password</Text>
          <View className="flex-row items-center rounded-xl border border-gray-200 bg-slate-50 px-4">
            <Ionicons name="lock-closed-outline" size={20} color="#64748b" />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Create a password"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showPassword}
              className="ml-3 flex-1 py-4 text-base text-slate-900"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm Password Input */}
        <View className="mb-6">
          <Text className="mb-2 text-sm font-semibold text-slate-900">Confirm Password</Text>
          <View className="flex-row items-center rounded-xl border border-gray-200 bg-slate-50 px-4">
            <Ionicons name="lock-closed-outline" size={20} color="#64748b" />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showConfirmPassword}
              className="ml-3 flex-1 py-4 text-base text-slate-900"
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Terms and Conditions */}
        <TouchableOpacity onPress={() => setAgreedToTerms(!agreedToTerms)} className="mb-8 flex-row items-start gap-3">
          <View
            className={`mt-0.5 h-5 w-5 items-center justify-center rounded border-2 ${
              agreedToTerms ? "border-slate-900 bg-slate-900" : "border-gray-300 bg-white"
            }`}>
            {agreedToTerms && <Ionicons name="checkmark" size={14} color="#ffffff" />}
          </View>
          <Text className="flex-1 text-sm text-slate-600">
            I agree to the <Text className="font-semibold text-slate-900">Terms & Conditions</Text> and{" "}
            <Text className="font-semibold text-slate-900">Privacy Policy</Text>
          </Text>
        </TouchableOpacity>

        {/* Register Button */}
        <TouchableOpacity
          onPress={handleRegister}
          disabled={isLoading || !agreedToTerms}
          className={`mb-6 rounded-xl py-4 shadow-lg ${isLoading || !agreedToTerms ? "bg-slate-400" : "bg-slate-900"}`}>
          <View className="flex-row items-center justify-center gap-2">
            {isLoading && (
              <View className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            <Text className="text-center text-base font-bold text-white">
              {isLoading ? "Creating Account..." : "Create Account"}
            </Text>
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

        {/* Sign In Link */}
        <View className="flex-row items-center justify-center pt-4">
          <Text className="text-sm text-slate-600">Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-sm font-bold text-slate-900">Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AuthLayout>
  );
}
