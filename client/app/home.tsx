import { Text, View, SafeAreaView, TouchableOpacity } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";

export default function Home() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/selectauth");
  };

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
      <View style={{ width: "80%", alignItems: "center" }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", marginBottom: 20, color: "#e30613" }}>
          Bine ai venit! 🎉
        </Text>
        <Text style={{ fontSize: 18, marginBottom: 10, color: "#333" }}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={{ fontSize: 16, marginBottom: 5, color: "#666" }}>
          {user?.email}
        </Text>
        <Text style={{ fontSize: 14, marginBottom: 30, color: "#999" }}>
          {user?.role} • {user?.department}
        </Text>
        
        <TouchableOpacity
          onPress={handleLogout}
          style={{ backgroundColor: "#e30613", padding: 15, borderRadius: 8, width: "100%" }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", textAlign: "center", fontSize: 16 }}>
            Deconectare
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
