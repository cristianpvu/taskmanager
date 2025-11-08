import { Text, View, SafeAreaView, TextInput, TouchableOpacity, Alert } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { authAPI } from "@/services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Eroare", "Completează toate câmpurile!");
      return;
    }

    try {
      const response = await authAPI.login(email, password);
      
      if (response.token && response.user) {
        await login(response.token, response.user);
        router.replace("/home" as any);
      }
    } catch (error: any) {
      Alert.alert("Eroare", error.response?.data?.message || "Eroare la autentificare!");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
      <View style={{ width: "80%" }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>Login</Text>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 10 }}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          placeholder="Parolă"
          value={password}
          onChangeText={setPassword}
          style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 20 }}
          secureTextEntry
        />
        <TouchableOpacity onPress={handleLogin} style={{ backgroundColor: "#e30613", padding: 15, borderRadius: 8 }}>
          <Text style={{ color: "#fff", fontWeight: "bold", textAlign: "center" }}>Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}