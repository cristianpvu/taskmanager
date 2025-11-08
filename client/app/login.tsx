import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { authAPI } from "@/services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Email and password are required!");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await authAPI.login(email.trim().toLowerCase(), password);

      if (response.token && response.user) {
        await login(response.token, response.user);
        router.replace("/home" as any);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.response) {
        if (err.response.status === 404) {
          setError("User not found. Check your email!");
        } else if (err.response.status === 401) {
          setError("Incorrect password!");
        } else {
          setError(err.response.data.message || "Login failed!");
        }
      } else if (err.request) {
        setError("Cannot connect to the server. Check your connection!");
      } else {
        setError("Unexpected error occurred!");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert("Reset Password", "A reset link has been sent to your email!");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F0F4FF" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F4FF" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              paddingHorizontal: 24,
              paddingVertical: 40,
            }}
          >
            <View style={{ alignItems: "center", marginBottom: 48 }}>
              <Text style={{ fontSize: 32, fontWeight: "bold", marginBottom: 8 }}>
                <Text style={{ color: "#1F2937" }}>Secure</Text>
                <Text style={{ color: "#2563EB" }}>Task</Text>
              </Text>
            </View>

            {error ? (
              <View
                style={{
                  backgroundColor: "#FEE2E2",
                  borderWidth: 1,
                  borderColor: "#FCA5A5",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 18, marginRight: 8 }}>⚠️</Text>
                <Text style={{ color: "#B91C1C", fontSize: 14, flex: 1 }}>{error}</Text>
              </View>
            ) : null}

            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Email
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  height: 56,
                }}
              >
                <TextInput
                  placeholder="example@email.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError("");
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: "#1F2937",
                    padding: 0,
                  }}
                />
              </View>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Password
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  height: 56,
                }}
              >
                <TextInput
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError("");
                  }}
                  secureTextEntry
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: "#1F2937",
                    padding: 0,
                  }}
                />
              </View>
            </View>

            <View style={{ alignItems: "flex-end", marginBottom: 24 }}>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#2563EB",
                    fontWeight: "600",
                  }}
                >
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              style={{
                backgroundColor: isLoading ? "#93C5FD" : "#2563EB",
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                shadowColor: "#2563EB",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
                minHeight: 56,
              }}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text
                    style={{
                      color: "#FFF",
                      fontSize: 16,
                      fontWeight: "600",
                      marginLeft: 12,
                    }}
                  >
                    Loading...
                  </Text>
                </View>
              ) : (
                <Text
                  style={{
                    color: "#FFF",
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
              <Text
                style={{
                  marginHorizontal: 16,
                  fontSize: 14,
                  color: "#6B7280",
                }}
              >
                or
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 14, color: "#6B7280" }}>
                Don’t have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/autentificareutilizator")}>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#2563EB",
                    fontWeight: "600",
                  }}
                >
                  Create one
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
