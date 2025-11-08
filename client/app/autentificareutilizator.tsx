import { Text, View, SafeAreaView, TextInput, TouchableOpacity, Alert } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { authAPI } from "@/services/api";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("Employee");
  const [department, setDepartment] = useState("Engineering");

  const handleSignUp = async () => {
    if (!email || !password || !firstName || !lastName) {
      Alert.alert("Eroare", "Completează toate câmpurile!");
      return;
    }

    try {
      await authAPI.register(email, password, firstName, lastName, role, department);
      Alert.alert("Succes", "Cont creat! Te poți autentifica acum.", [
        { text: "OK", onPress: () => router.push("/login") }
      ]);
    } catch (error: any) {
      Alert.alert("Eroare", error.response?.data?.message || "Eroare la înregistrare!");
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
          placeholder="Prenume"
          value={firstName}
          onChangeText={setFirstName}
          style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 10 }}
        />
        <TextInput
          placeholder="Nume"
          value={lastName}
          onChangeText={setLastName}
          style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 10 }}
        />

        <Text style={{ fontSize: 14, color: "#666", marginBottom: 5, marginTop: 5 }}>Rol:</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {["Employee", "Team Lead", "Project Manager", "Intern", "Contractor", "CEO"].map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRole(r)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 6,
                backgroundColor: role === r ? "#e30613" : "#f0f0f0",
                borderWidth: 1,
                borderColor: role === r ? "#e30613" : "#ccc"
              }}
            >
              <Text style={{ color: role === r ? "#fff" : "#333", fontSize: 12 }}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ fontSize: 14, color: "#666", marginBottom: 5 }}>Department:</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {["Engineering", "Design", "Marketing", "Sales", "HR", "Finance", "Operations", "Customer Support"].map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => setDepartment(d)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 6,
                backgroundColor: department === d ? "#e30613" : "#f0f0f0",
                borderWidth: 1,
                borderColor: department === d ? "#e30613" : "#ccc"
              }}
            >
              <Text style={{ color: department === d ? "#fff" : "#333", fontSize: 12 }}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={handleSignUp} style={{ backgroundColor: "#e30613", padding: 15, borderRadius: 8 }}>
          <Text style={{ color: "#fff", fontWeight: "bold", textAlign: "center" }}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
