import { Text, View, SafeAreaView, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView } from "react-native";
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
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      await authAPI.register(email, password, firstName, lastName, role, department);
      Alert.alert("Success", "Account created successfully", [
        { text: "OK", onPress: () => router.push("/login") }
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Registration failed");
    }
  };

  const roles = ["Employee", "Team Lead", "Project Manager", "Intern", "Contractor", "CEO"];
  const departments = ["Engineering", "Design", "Marketing", "Sales", "HR", "Finance", "Operations", "Customer Support"];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join your team today</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                placeholder="Enter your email"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                placeholder="Create a password"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  placeholder="First name"
                  placeholderTextColor="#64748B"
                  value={firstName}
                  onChangeText={setFirstName}
                  style={styles.input}
                />
              </View>

              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  placeholder="Last name"
                  placeholderTextColor="#64748B"
                  value={lastName}
                  onChangeText={setLastName}
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.selectorContainer}>
              <Text style={styles.selectorLabel}>Role</Text>
              <View style={styles.chipContainer}>
                {roles.map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRole(r)}
                    style={[
                      styles.chip,
                      role === r && styles.chipSelected
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.chipText,
                      role === r && styles.chipTextSelected
                    ]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.selectorContainer}>
              <Text style={styles.selectorLabel}>Department</Text>
              <View style={styles.chipContainer}>
                {departments.map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDepartment(d)}
                    style={[
                      styles.chip,
                      department === d && styles.chipSelected
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.chipText,
                      department === d && styles.chipTextSelected
                    ]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity onPress={handleSignUp} style={styles.button} activeOpacity={0.8}>
              <Text style={styles.buttonText}>Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>Back to Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1628",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 36,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#94A3B8",
  },
  form: {
    gap: 20,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E2E8F0",
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#FFFFFF",
  },
  selectorContainer: {
    gap: 12,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E2E8F0",
    marginLeft: 4,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
  },
  chipSelected: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#94A3B8",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  button: {
    backgroundColor: "#3B82F6",
    paddingVertical: 18,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  backButton: {
    paddingVertical: 12,
  },
  backButtonText: {
    color: "#64748B",
    fontSize: 15,
    textAlign: "center",
  },
});