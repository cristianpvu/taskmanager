import React, { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet, SafeAreaView, StatusBar, Platform } from "react-native";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import NotificationsModal from "@/components/NotificationsModal";

const COLORS = {
    primary: "#2563EB",
    white: "#FFFFFF",
    background: "#F8FAFC",
    text: "#0F172A",
    textLight: "#64748B",
    border: "#E2E8F0",
};

// Roles that can access the Messages/Admin Dashboard
const ADMIN_ROLES = ['CEO', 'Project Manager', 'Team Lead'];

export default function TabsLayout() {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const { unreadCount } = useSocket();
    const [showNotifications, setShowNotifications] = useState(false);

    const isActive = (path: string) => pathname === path;

    // Check if user has admin access
    const hasAdminAccess = user && ADMIN_ROLES.includes(user.role);

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>TaskManager</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity 
                        style={styles.iconButton}
                        onPress={() => setShowNotifications(true)}
                    >
                        <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
                        {unreadCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.avatar}
                        onPress={() => router.push("/profile" as any)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.avatarText}>
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
            
            <NotificationsModal 
                visible={showNotifications}
                onClose={() => setShowNotifications(false)}
            />

            {/* Content */}
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: { display: "none" },
                }}
            >
                <Tabs.Screen name="feed" />
                <Tabs.Screen name="groups" />
                <Tabs.Screen name="mytasks" />
                <Tabs.Screen name="messages" />
                <Tabs.Screen name="profile" />
            </Tabs>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => router.push("/feed" as any)}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={isActive("/feed") ? "home" : "home-outline"}
                        size={24}
                        color={isActive("/feed") ? COLORS.primary : COLORS.textLight}
                    />
                    <Text style={[styles.navText, isActive("/feed") && styles.navTextActive]}>Feed</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => router.push("/groups" as any)}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={isActive("/groups") ? "people" : "people-outline"}
                        size={24}
                        color={isActive("/groups") ? COLORS.primary : COLORS.textLight}
                    />
                    <Text style={[styles.navText, isActive("/groups") && styles.navTextActive]}>Teams</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => router.push("/mytasks" as any)}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={isActive("/mytasks") ? "checkbox" : "checkbox-outline"}
                        size={24}
                        color={isActive("/mytasks") ? COLORS.primary : COLORS.textLight}
                    />
                    <Text style={[styles.navText, isActive("/mytasks") && styles.navTextActive]}>My Tasks</Text>
                </TouchableOpacity>

                {/* Only show Messages tab for admin roles */}
                {hasAdminAccess && (
                    <TouchableOpacity
                        style={styles.navItem}
                        onPress={() => router.push("/messages" as any)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={isActive("/messages") ? "chatbubbles" : "chatbubbles-outline"}
                            size={24}
                            color={isActive("/messages") ? COLORS.primary : COLORS.textLight}
                        />
                        <Text style={[styles.navText, isActive("/messages") && styles.navTextActive]}>Dashboard</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => router.push("/profile" as any)}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={isActive("/profile") ? "person" : "person-outline"}
                        size={24}
                        color={isActive("/profile") ? COLORS.primary : COLORS.textLight}
                    />
                    <Text style={[styles.navText, isActive("/profile") && styles.navTextActive]}>Profile</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.text,
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    iconButton: {
        padding: 4,
        position: "relative",
    },
    badge: {
        position: "absolute",
        top: 0,
        right: 0,
        backgroundColor: "#EF4444",
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 4,
    },
    badgeText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: "bold",
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: "bold",
    },
    bottomNav: {
        flexDirection: "row",
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingBottom: 8,
        paddingTop: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 10,
    },
    navItem: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
    },
    navText: {
        fontSize: 11,
        color: COLORS.textLight,
        marginTop: 4,
    },
    navTextActive: {
        color: COLORS.primary,
        fontWeight: "600",
    },
});