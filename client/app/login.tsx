import { Text, View, SafeAreaView, TextInput, TouchableOpacity } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import axios from "axios";
import { IP } from "@/data/ip";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
  const apiURL = `http://${IP}:5555/utilizator/login`;
      const response = await axios.post(apiURL, {
        email,
        password
      });
      if (response.data.data === "Corect") {
        router.push("/selectauth");
      } else {
        alert("Email sau parolă incorectă!");
      }
    } catch (error) {
      alert("Eroare la autentificare!");
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