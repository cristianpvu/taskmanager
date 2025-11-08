import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const currentRoute = segments[0];

    if (user && (currentRoute === "selectauth" || currentRoute === "login" || currentRoute === "autentificareutilizator")) {
      router.replace("/home" as any);
    } else if (!user && currentRoute !== "selectauth" && currentRoute !== "login" && currentRoute !== "autentificareutilizator") {
      router.replace("/selectauth");
    }
  }, [user, isLoading, segments]);

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
