import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { authAPI } from "@/services/api";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("Employee");
  const [department, setDepartment] = useState("Engineering");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const roles = ["Employee", "Team Lead", "Project Manager", "Intern", "Contractor", "CEO"];
  const departments = ["Engineering", "Design", "Marketing", "Sales", "HR", "Finance", "Operations", "Customer Support"];

  const handleSignUp = async () => {
    if (!email || !password || !firstName || !lastName) {
      setError("Please fill in all fields");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      await authAPI.register(email.trim().toLowerCase(), password, firstName, lastName, role, department);
      Alert.alert("Success", "Account created successfully", [
        { text: "OK", onPress: () => router.push("/login") }
      ]);
    } catch (err: any) {
      console.error("SignUp error:", err);
      setError(err.response?.data?.message || "Registration failed!");
    } finally {
      setIsLoading(false);
    }
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
          <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 }}>

            <View style={{ alignItems: "center", marginBottom: 30, marginTop: 30 }}>
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
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                Email
              </Text>
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 12,
                paddingHorizontal: 16,
                height: 56,
              }}>
                <TextInput
                  placeholder="example@email.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={(text) => { setEmail(text); setError(""); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{ flex: 1, fontSize: 16, color: "#1F2937", padding: 0 }}
                />
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                Password
              </Text>
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 12,
                paddingHorizontal: 16,
                height: 56,
              }}>
                <TextInput
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={(text) => { setPassword(text); setError(""); }}
                  secureTextEntry
                  style={{ flex: 1, fontSize: 16, color: "#1F2937", padding: 0 }}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>First Name</Text>
                <View style={{
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  height: 56,
                  justifyContent: "center",
                }}>
                  <TextInput
                    placeholder="First name"
                    placeholderTextColor="#9CA3AF"
                    value={firstName}
                    onChangeText={(text) => { setFirstName(text); setError(""); }}
                    style={{ fontSize: 16, color: "#1F2937", padding: 0 }}
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>Last Name</Text>
                <View style={{
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  height: 56,
                  justifyContent: "center",
                }}>
                  <TextInput
                    placeholder="Last name"
                    placeholderTextColor="#9CA3AF"
                    value={lastName}
                    onChangeText={(text) => { setLastName(text); setError(""); }}
                    style={{ fontSize: 16, color: "#1F2937", padding: 0 }}
                  />
                </View>
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>Role</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {roles.map(r => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRole(r)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: role === r ? "#2563EB" : "#E5E7EB",
                      backgroundColor: role === r ? "#2563EB" : "#F9FAFB",
                    }}
                  >
                    <Text style={{ color: role === r ? "#FFF" : "#1F2937", fontWeight: "600" }}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 }}>Department</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {departments.map(d => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDepartment(d)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: department === d ? "#2563EB" : "#E5E7EB",
                      backgroundColor: department === d ? "#2563EB" : "#F9FAFB",
                    }}
                  >
                    <Text style={{ color: department === d ? "#FFF" : "#1F2937", fontWeight: "600" }}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSignUp}
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
              <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>
                {isLoading ? "Creating..." : "Create Account"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ fontSize: 14, color: "#2563EB", fontWeight: "600", textAlign: "center" }}>
                Back to Start
              </Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
