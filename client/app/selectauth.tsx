import { Text, View, SafeAreaView, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';

export default function SelectAuth() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.logo}>TaskFlow</Text>
                    <Text style={styles.tagline}>Professional Task Management</Text>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.push("/login")}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryButtonText}>Sign In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => router.push("/autentificareutilizator")}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.secondaryButtonText}>Create Account</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.footer}>Streamline your workflow</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0A1628",
    },
    content: {
        flex: 1,
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 32,
        paddingVertical: 60,
    },
    header: {
        alignItems: "center",
        marginTop: 80,
    },
    logo: {
        fontSize: 48,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: -1,
        marginBottom: 12,
    },
    tagline: {
        fontSize: 16,
        color: "#94A3B8",
        letterSpacing: 0.5,
    },
    buttonContainer: {
        width: "100%",
        gap: 16,
    },
    primaryButton: {
        backgroundColor: "#3B82F6",
        paddingVertical: 18,
        borderRadius: 12,
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "600",
        textAlign: "center",
        letterSpacing: 0.5,
    },
    secondaryButton: {
        backgroundColor: "transparent",
        paddingVertical: 18,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#3B82F6",
    },
    secondaryButtonText: {
        color: "#3B82F6",
        fontSize: 17,
        fontWeight: "600",
        textAlign: "center",
        letterSpacing: 0.5,
    },
    footer: {
        fontSize: 14,
        color: "#64748B",
        marginBottom: 20,
    },
});