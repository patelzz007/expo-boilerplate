import { AuthLayout } from "@/components/AuthLayout";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/schemas";
import { useToast } from "@/components/Toast";
import { useTheme } from "@/components/ThemeProvider";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const { tokens } = useTheme();

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  const handleLogin = async (data: LoginFormData) => {
    if (isLoading) return;
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Login with:", data);
    showToast("Signed in successfully", "success", 1800);
    setIsLoading(false);
    router.replace("/(tabs)");
  };

  const handleQuickLogin = () => {
    const demoData: LoginFormData = { email: "demo@example.com", password: "password123" };
    setValue("email", demoData.email, { shouldValidate: true });
    setValue("password", demoData.password, { shouldValidate: true });
    handleSubmit(() => handleLogin(getValues()))();
  };

  const handleSocialLogin = (provider: string) => {
    console.log("Login with:", provider);
    router.replace("/(tabs)");
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to continue" showLogo={true}>
      <View className="py-8">
        <Input
          name="email"
          control={control}
          label="Email Address"
          icon="mail-outline"
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email?.message}
        />

        <Input
          name="password"
          control={control}
          label="Password"
          icon="lock-closed-outline"
          placeholder="Enter your password"
          isPassword
          error={errors.password?.message}
        />

        {/* Forgot Password */}
        <Button
          variant="link"
          onPress={() => {}}
          className="mb-8 self-end p-0"
          textClass="text-sm font-semibold">
          <Text className="text-sm font-semibold" style={{ color: tokens.text }}>Forgot Password?</Text>
        </Button>

        {/* Login Button */}
        <Button
          onPress={handleSubmit(handleLogin)}
          disabled={!isValid || isLoading}
          className="mb-3 rounded-xl py-4 shadow-lg"
          style={{ backgroundColor: !isValid || isLoading ? tokens.border : tokens.primary }}
          textClass="font-bold text-base">
          <View className="flex-row items-center justify-center gap-2">
            {isLoading && (
              <View className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: tokens.primaryTextOn }} />
            )}
            <Text className="font-bold text-base" style={{ color: !isValid || isLoading ? tokens.textMuted : tokens.primaryTextOn }}>
              {isLoading ? "Signing In..." : "Sign In"}
            </Text>
          </View>
        </Button>

        {/* Quick Login Button */}
        <Button
          onPress={handleQuickLogin}
          variant="outline"
          className="mb-8 rounded-xl py-4 shadow-sm"
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border, borderWidth: 1 }}
          textClass="font-bold text-base">
          <View className="flex-row items-center justify-center gap-2">
            <Ionicons name="flash" size={18} color={tokens.text as any} />
            <Text className="font-bold text-base" style={{ color: tokens.text }}>Quick Login</Text>
          </View>
        </Button>

        {/* Divider */}
        <View className="my-6 flex-row items-center">
          <View className="h-px flex-1" style={{ backgroundColor: tokens.border }} />
          <Text className="px-4 text-sm" style={{ color: tokens.textMuted }}>or continue with</Text>
          <View className="h-px flex-1" style={{ backgroundColor: tokens.border }} />
        </View>

        {/* Social Login */}
        <View className="mb-4 gap-3">
          <TouchableOpacity
            onPress={() => handleSocialLogin("Google")}
            className="flex-row items-center justify-center gap-3 rounded-xl py-4 shadow-sm"
            style={{ backgroundColor: tokens.surface, borderColor: tokens.border, borderWidth: 1 }}>
            <Ionicons name="logo-google" size={22} color={tokens.text as any} />
            <Text className="text-base font-semibold" style={{ color: tokens.text }}>Continue with Google</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleSocialLogin("Apple")}
            className="flex-row items-center justify-center gap-3 rounded-xl py-4 shadow-sm"
            style={{ backgroundColor: tokens.surface, borderColor: tokens.border, borderWidth: 1 }}>
            <Ionicons name="logo-apple" size={22} color={tokens.text as any} />
            <Text className="text-base font-semibold" style={{ color: tokens.text }}>Continue with Apple</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleSocialLogin("Facebook")}
            className="flex-row items-center justify-center gap-3 rounded-xl py-4 shadow-sm"
            style={{ backgroundColor: tokens.surface, borderColor: tokens.border, borderWidth: 1 }}>
            <Ionicons name="logo-facebook" size={22} color={tokens.text as any} />
            <Text className="text-base font-semibold" style={{ color: tokens.text }}>Continue with Facebook</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Up Link */}
      <View className="flex-row items-center justify-center pt-4">
        <Text className="text-sm" style={{ color: tokens.textMuted }}>{"Don't have an account? "}</Text>
        <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
          <Text className="font-bold text-sm" style={{ color: tokens.text }}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </AuthLayout>
  );
}
