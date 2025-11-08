import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="selectauth" options={{
        headerTitle:"", headerShown:false
      }}/>
      <Stack.Screen name="autentificareutilizator" options={{
        headerTitle:"", headerShown:false, headerBackVisible:false
      }}/>
      <Stack.Screen name="login" options={{
        headerTitle:"", headerBackVisible:false, headerShown: false
      }}/>
    </Stack>
  );
}
