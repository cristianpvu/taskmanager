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
      if (currentRoute !== "home") {
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
    <Stack>
      <Stack.Screen name="selectauth" options={{ headerShown: false }} />
      <Stack.Screen name="autentificareutilizator" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="home" options={{ headerShown: false }} />
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
