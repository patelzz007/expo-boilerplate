import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { Input } from "@/components/Input";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormData } from "@/lib/schemas";
import { useAlert } from "@/components/Alert";
import { useToast } from "@/components/Toast";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { PasswordRequirementsDisplay } from "@/components/PasswordRequirementsDisplay";

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const { showAlert } = useAlert();
  const { showToast } = useToast();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreedToTerms: false,
    },
  });

  const agreedToTerms = watch("agreedToTerms");

  const handleRegister = async (data: RegisterFormData) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Register with:", data);
    setIsLoading(false);
    
    showToast("Account created successfully!", "success", 2000);
    
    // Navigate after brief delay
    setTimeout(() => {
      router.replace("/(tabs)");
    }, 500);
  };

  const handleSocialLogin = async (provider: "Google" | "Apple" | "Facebook") => {
    if (isLoading) return;
    setIsLoading(true);
    // Simulate provider auth
    await new Promise((resolve) => setTimeout(resolve, 1200));
    console.log(`Social login with: ${provider}`);
    showToast(`Signed in with ${provider}`, "success", 1600);
    setIsLoading(false);
    router.replace("/(tabs)");
  };

  const password = watch("password");

  return (
    <AuthLayout title="Get Started" subtitle="Create your account to continue" showLogo={true} showBackButton={true}>
      <View className="pb-8">
        <Input
          name="fullName"
          control={control}
          label="Full Name"
          icon="person-outline"
          placeholder="Enter your full name"
          autoCapitalize="words"
          error={errors.fullName?.message}
        />

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
          placeholder="Create a password"
          isPassword
          error={errors.password?.message}
        />

        {password && (
          <View className="-mt-4 mb-6">
            <PasswordStrengthIndicator password={password} />
            <PasswordRequirementsDisplay password={password} />
          </View>
        )}

        <Input
          name="confirmPassword"
          control={control}
          label="Confirm Password"
          icon="lock-closed-outline"
          placeholder="Confirm your password"
          isPassword
          error={errors.confirmPassword?.message}
        />

        {/* Terms and Conditions */}
        <Controller
          control={control}
          name="agreedToTerms"
          render={({ field: { onChange, value } }) => (
            <>
              <TouchableOpacity onPress={() => onChange(!value)} className="mb-8 flex-row items-start gap-3">
                <View
                  className={`mt-0.5 h-5 w-5 items-center justify-center rounded border-2 ${
                    value ? "border-slate-900 bg-slate-900" : "border-gray-300 bg-white"
                  }`}>
                  {value && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                </View>
                <Text className="flex-1 text-sm text-slate-600">
                  I agree to the <Text className="font-semibold text-slate-900">Terms & Conditions</Text> and{" "}
                  <Text className="font-semibold text-slate-900">Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
              {errors.agreedToTerms && <Text className="mb-4 text-xs text-red-600">{errors.agreedToTerms.message}</Text>}
            </>
          )}
        />

        {/* Register Button */}
        <TouchableOpacity
          onPress={handleSubmit(handleRegister)}
          disabled={isLoading || !isValid}
          className={`mb-6 rounded-xl py-4 shadow-lg ${isLoading || !isValid ? "bg-slate-400" : "bg-slate-900"}`}>
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
