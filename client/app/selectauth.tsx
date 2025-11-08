import { Text, View, SafeAreaView, TouchableOpacity } from "react-native";
import { router } from "expo-router";

export default function SelectAuth() {
    return (
        <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
            <View style={{ width: "80%" }}>
                <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 30, textAlign: "center" }}>
                    Bine ai venit!
                </Text>
                <TouchableOpacity
                    style={{ backgroundColor: "#e30613", padding: 15, borderRadius: 8, marginBottom: 15 }}
                    onPress={() => router.push("/login")}
                >
                    <Text style={{ color: "#fff", fontWeight: "bold", textAlign: "center" }}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{ backgroundColor: "#e30613", padding: 15, borderRadius: 8 }}
                    onPress={() => router.push("/autentificareutilizator")}
                >
                    <Text style={{ color: "#fff", fontWeight: "bold", textAlign: "center" }}>Sign Up</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}