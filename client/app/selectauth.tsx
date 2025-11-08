import { Text, View, SafeAreaView, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function SelectAuth() {
    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#2563EB', '#1E40AF']}
                style={styles.headerGradient}
            >
                <View style={styles.decorCircle1} />
                <View style={styles.decorCircle2} />

                <View style={styles.logoContainer}>
                    <View style={styles.logoBox}>
                        <Ionicons name="shield-checkmark" size={50} color="#2563EB" />
                    </View>
                </View>

                <Text style={styles.appTitle}>SecureTask</Text>
            </LinearGradient>

            <View style={styles.contentContainer}>
                <Text style={styles.welcomeTitle}>Welcome!</Text>
                <Text style={styles.welcomeSubtitle}>
                    Manage security tasks with ease
                </Text>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.signInButton}
                        onPress={() => router.push("/login")}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.signInButtonText}>Sign In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.signUpButton}
                        onPress={() => router.push("/autentificareutilizator")}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#2563EB', '#1E40AF']}
                            style={styles.signUpButtonGradient}
                        >
                            <Text style={styles.signUpButtonText}>Create Account</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <Text style={styles.termsText}>
                    By connecting, you agree to our{' '}
                    <Text style={styles.termsLink}>Terms and Conditions</Text>
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    headerGradient: {
        paddingTop: 80,
        paddingBottom: 120,
        paddingHorizontal: 24,
        position: 'relative',
        overflow: 'hidden',
    },
    decorCircle1: {
        position: 'absolute',
        top: 40,
        right: 40,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    decorCircle2: {
        position: 'absolute',
        bottom: 40,
        left: 40,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 24,
        zIndex: 10,
    },
    logoBox: {
        width: 80,
        height: 80,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    appTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 8,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        marginTop: -60,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    welcomeTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 40,
    },
    buttonContainer: {
        gap: 16,
    },
    signInButton: {
        backgroundColor: '#2563EB',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    signInButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    signUpButton: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    signUpButtonGradient: {
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    signUpButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    termsText: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 32,
    },
    termsLink: {
        color: '#2563EB',
        fontWeight: '600',
    },
});