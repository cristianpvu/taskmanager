import { Text, View, SafeAreaView, TextInput, TouchableOpacity } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import axios from "axios";
import { IP } from "@/data/ip";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nume, setNume] = useState("");
  const [prenume, setPrenume] = useState("");

  const handleSignUp = async () => {
    try {
      const apiUrl = `http://${IP}:5555/utilizator/register`;
      const response = await axios.post(apiUrl, {
        email,
        password,
        nume,
        prenume
      });
      if (response.data.data === "Exista deja un utilizator cu acest email.") {
        alert("Email deja folosit!");
      } else {
        alert("Cont creat cu succes!");
        router.push("/login");
      }
    } catch (error) {
      alert("Eroare la înregistrare!");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
      <View style={{ width: "80%" }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>Sign Up</Text>
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
          style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 10 }}
          secureTextEntry
        />
        <TextInput
          placeholder="Nume"
          value={nume}
          onChangeText={setNume}
          style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 10 }}
        />
        <TextInput
          placeholder="Prenume"
          value={prenume}
          onChangeText={setPrenume}
          style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 20 }}
        />
        <TouchableOpacity onPress={handleSignUp} style={{ backgroundColor: "#e30613", padding: 15, borderRadius: 8 }}>
          <Text style={{ color: "#fff", fontWeight: "bold", textAlign: "center" }}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
