import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { AuthProvider, useAuth } from "@/context/AuthContext";

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const currentRoute = segments[0];

    if (user) {
      if (currentRoute !== "home" && currentRoute !== "(tabs)" && currentRoute !== "taskdetails") {
        router.replace("/home" as any);
      }
    } else {
      if (currentRoute !== "login" && currentRoute !== "autentificareutilizator" && currentRoute !== "selectauth") {
        router.replace("/selectauth" as any);
      }
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="selectauth" />
      <Stack.Screen name="autentificareutilizator" />
      <Stack.Screen name="login" />
      <Stack.Screen name="home" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="taskdetails" />
      <Stack.Screen name="components/GroupDetail" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
