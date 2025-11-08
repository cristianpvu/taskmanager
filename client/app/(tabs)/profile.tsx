import React, { useState, useEffect } from "react";
import {
    Text,
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import axios from "axios";
import { IP } from "@/data/ip";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LogBox } from 'react-native';
LogBox.ignoreAllLogs();

const COLORS = {
    primary: "#2563EB",
    primaryDark: "#1E40AF",
    white: "#FFFFFF",
    background: "#F8FAFC",
    cardBg: "#FFFFFF",
    text: "#0F172A",
    textSecondary: "#475569",
    textLight: "#64748B",
    border: "#E2E8F0",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    gradient1: "#2563EB",
    gradient2: "#1E40AF",
    streakLow: "#EBEDF0",
    streakMedium: "#9BE9A8",
    streakHigh: "#40C463",
    streakVeryHigh: "#30A14E",
    streakMax: "#216E39",
};

interface Stats {
    tasksCompleted: number;
    tasksInProgress: number;
    tasksOverdue: number;
    currentStreak: number;
    longestStreak: number;
    lastTaskCompletedDate: Date | null;
}

interface Task {
    _id: string;
    completedDate?: string;
    status: string;
    title: string;
    updatedAt?: string;
    claimedAt?: string;
}

export default function Profile() {
    const { user, logout, login } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<Stats | null>(null);
    const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
    const [claimedTasks, setClaimedTasks] = useState<Task[]>([]);
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editedFirstName, setEditedFirstName] = useState(user?.firstName || "");
    const [editedLastName, setEditedLastName] = useState(user?.lastName || "");
    const [editedBio, setEditedBio] = useState(user?.bio || "");
    const [editedPhoneNumber, setEditedPhoneNumber] = useState(user?.phoneNumber || "");
    const [editedStatus, setEditedStatus] = useState(user?.status || "Available");

    useEffect(() => {
        loadProfileData();
    }, []);

    const loadProfileData = async () => {
        try {
            const token = await AsyncStorage.getItem("authToken");

            // Fetch stats
            const statsResponse = await axios.get(`http://${IP}:5555/user/${user?._id}/stats`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setStats(statsResponse.data);

            // Fetch all user tasks
            const allTasksResponse = await axios.get(
                `http://${IP}:5555/tasks/user/${user?._id}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setAllTasks(allTasksResponse.data);

            // Filter completed tasks
            const completed = allTasksResponse.data.filter((task: Task) => task.status === "Completed");
            setCompletedTasks(completed);

            // Filter claimed tasks (for contribution graph)
            const claimed = allTasksResponse.data.filter((task: Task) => task.claimedAt);
            setClaimedTasks(claimed);

            console.log("All tasks loaded:", allTasksResponse.data.length);
            console.log("Completed tasks:", completed.length);
            console.log("Claimed tasks:", claimed.length);
        } catch (error) {
            console.error("Error loading profile data:", error);
            Alert.alert("Error", "Failed to load profile data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadProfileData();
    };

    const handleUpdateProfile = async () => {
        try {
            const token = await AsyncStorage.getItem("authToken");
            const response = await axios.put(
                `http://${IP}:5555/user/${user?._id}`,
                {
                    firstName: editedFirstName,
                    lastName: editedLastName,
                    bio: editedBio,
                    phoneNumber: editedPhoneNumber,
                    status: editedStatus,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            // Update user in AuthContext using login function
            if (token && response.data.user) {
                await login(token, response.data.user);
            }

            Alert.alert("Success", "Profile updated successfully!");
            setShowEditModal(false);
            loadProfileData();
        } catch (error) {
            console.error("Error updating profile:", error);
            Alert.alert("Error", "Failed to update profile");
        }
    };

    const handleLogout = () => {
        Alert.alert(
            "Disconnect",
            "Are you sure you want to disconnect from your account?",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Disconnect",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            console.log("Starting logout process...");
                            await logout();
                            console.log("Logout completed");
                            router.replace("/selectauth");
                            console.log("Navigation completed");
                        } catch (error) {
                            console.error("Error during logout:", error);
                            Alert.alert("Error", "Failed to disconnect: " + error.message);
                        }
                    },
                },
            ]
        );
    };

    const getInitials = () => {
        if (!user) return "??";
        return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    };

    const getContributionData = () => {
        const weeks = [];
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        for (let weekIndex = 11; weekIndex >= 0; weekIndex--) {
            const week = [];
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const date = new Date(today);
                date.setDate(date.getDate() - (weekIndex * 7 + (6 - dayIndex)));
                date.setHours(0, 0, 0, 0);

                // Count tasks completed OR claimed on this date
                const tasksOnDate = allTasks.filter((task) => {
                    // Check completed date
                    if (task.completedDate) {
                        const completedDate = new Date(task.completedDate);
                        completedDate.setHours(0, 0, 0, 0);
                        if (completedDate.getTime() === date.getTime()) return true;
                    }

                    // Check claimed date
                    if (task.claimedAt) {
                        const claimedDate = new Date(task.claimedAt);
                        claimedDate.setHours(0, 0, 0, 0);
                        if (claimedDate.getTime() === date.getTime()) return true;
                    }

                    return false;
                }).length;

                week.push({
                    date,
                    count: tasksOnDate,
                    level: tasksOnDate === 0 ? 0 :
                        tasksOnDate <= 2 ? 1 :
                            tasksOnDate <= 4 ? 2 :
                                tasksOnDate <= 6 ? 3 : 4,
                });
            }
            weeks.push(week);
        }
        return weeks;
    };

    const getStreakColor = (level: number) => {
        switch (level) {
            case 0: return COLORS.streakLow;
            case 1: return COLORS.streakMedium;
            case 2: return COLORS.streakHigh;
            case 3: return COLORS.streakVeryHigh;
            case 4: return COLORS.streakMax;
            default: return COLORS.streakLow;
        }
    };

    const getTotalContributions = () => {
        // Count unique dates where tasks were completed or claimed
        const uniqueDates = new Set();

        allTasks.forEach(task => {
            if (task.completedDate) {
                const date = new Date(task.completedDate);
                date.setHours(0, 0, 0, 0);
                uniqueDates.add(date.getTime());
            }
            if (task.claimedAt) {
                const date = new Date(task.claimedAt);
                date.setHours(0, 0, 0, 0);
                uniqueDates.add(date.getTime());
            }
        });

        return allTasks.filter(t => t.completedDate || t.claimedAt).length;
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case "CEO": return "crown";
            case "Project Manager": return "briefcase";
            case "Team Lead": return "people";
            case "Employee": return "person";
            case "Intern": return "school";
            case "Contractor": return "hammer";
            default: return "person";
        }
    };

    const getStatusColor = (status: string) => {
        if (status?.toLowerCase().includes("available")) return COLORS.success;
        if (status?.toLowerCase().includes("busy")) return COLORS.warning;
        if (status?.toLowerCase().includes("away")) return COLORS.textLight;
        return COLORS.primary;
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                }
                showsVerticalScrollIndicator={false}
            >
                <LinearGradient
                    colors={[COLORS.gradient1, COLORS.gradient2]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerCard}
                >
                    <View style={styles.headerContent}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{getInitials()}</Text>
                            </View>
                            <View style={styles.statusIndicator}>
                                <View style={[styles.statusDot, { backgroundColor: getStatusColor(user?.status || "") }]} />
                            </View>
                        </View>

                        <View style={styles.headerInfo}>
                            <Text style={styles.userName}>
                                {user?.firstName} {user?.lastName}
                            </Text>
                            <View style={styles.roleContainer}>
                                <Text style={styles.userRole}>{user?.role}</Text>
                            </View>
                            <View style={styles.departmentBadge}>
                                <Ionicons name="briefcase" size={12} color={COLORS.white} />
                                <Text style={styles.departmentText}>{user?.department}</Text>
                            </View>
                            {user?.status && (
                                <Text style={styles.statusText}>{user.status}</Text>
                            )}
                        </View>

                        <TouchableOpacity style={styles.editButton} onPress={() => setShowEditModal(true)}>
                            <Ionicons name="create-outline" size={20} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.quickStats}>
                        <View style={styles.quickStatItem}>
                            <Text style={styles.quickStatValue}>{stats?.tasksCompleted || 0}</Text>
                            <Text style={styles.quickStatLabel}>Completed</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.quickStatItem}>
                            <Text style={styles.quickStatValue}>{stats?.tasksInProgress || 0}</Text>
                            <Text style={styles.quickStatLabel}>In Progress</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.quickStatItem}>
                            <View style={styles.streakIconContainer}>
                                <Ionicons name="flame" size={16} color={COLORS.warning} />
                                <Text style={styles.quickStatValue}>{stats?.currentStreak || 0}</Text>
                            </View>
                            <Text style={styles.quickStatLabel}>Day Streak</Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.section}>
                    <View style={styles.card}>
                        <View style={styles.contributionHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>Task Contributions</Text>
                                <Text style={styles.contributionSubtext}>
                                    {getTotalContributions()} tasks completed/claimed in the last 12 weeks
                                </Text>
                            </View>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.graphScroll}>
                            <View style={styles.contributionGraph}>
                                <View style={styles.weekDays}>
                                    <Text style={styles.weekDayLabel}>Mon</Text>
                                    <Text style={styles.weekDayLabel}>   </Text>
                                    <Text style={styles.weekDayLabel}>Wed</Text>
                                    <Text style={styles.weekDayLabel}>   </Text>
                                    <Text style={styles.weekDayLabel}>Fri</Text>
                                    <Text style={styles.weekDayLabel}>   </Text>
                                    <Text style={styles.weekDayLabel}>   </Text>
                                </View>
                                <View style={styles.graphContainer}>
                                    {getContributionData().map((week, weekIndex) => (
                                        <View key={weekIndex} style={styles.week}>
                                            {week.map((day, dayIndex) => (
                                                <View
                                                    key={dayIndex}
                                                    style={[
                                                        styles.day,
                                                        { backgroundColor: getStreakColor(day.level) },
                                                    ]}
                                                />
                                            ))}
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.contributionLegend}>
                            <Text style={styles.legendText}>Less</Text>
                            <View style={[styles.legendBox, { backgroundColor: COLORS.streakLow }]} />
                            <View style={[styles.legendBox, { backgroundColor: COLORS.streakMedium }]} />
                            <View style={[styles.legendBox, { backgroundColor: COLORS.streakHigh }]} />
                            <View style={[styles.legendBox, { backgroundColor: COLORS.streakVeryHigh }]} />
                            <View style={[styles.legendBox, { backgroundColor: COLORS.streakMax }]} />
                            <Text style={styles.legendText}>More</Text>
                        </View>
                    </View>
                </View>

                {user?.bio && (
                    <View style={styles.section}>
                        <View style={styles.bioCard}>
                            <View style={styles.sectionHeaderRow}>
                                <Ionicons name="information-circle" size={20} color={COLORS.primary} />
                                <Text style={styles.sectionTitle}>About</Text>
                            </View>
                            <Text style={styles.bioText}>{user.bio}</Text>
                        </View>
                    </View>
                )}

                <View style={styles.section}>
                    <View style={styles.card}>
                        <View style={styles.sectionHeaderRow}>
                            <Ionicons name="flame" size={20} color={COLORS.warning} />
                            <Text style={styles.sectionTitle}>Streak Achievements</Text>
                        </View>

                        <View style={styles.achievementGrid}>
                            <View style={styles.achievementCard}>
                                <View style={[styles.achievementIcon, { backgroundColor: `${COLORS.warning}20` }]}>
                                    <Ionicons name="flame" size={24} color={COLORS.warning} />
                                </View>
                                <Text style={styles.achievementValue}>{stats?.currentStreak || 0}</Text>
                                <Text style={styles.achievementLabel}>Current Streak</Text>
                            </View>

                            <View style={styles.achievementCard}>
                                <View style={[styles.achievementIcon, { backgroundColor: `${COLORS.success}20` }]}>
                                    <Ionicons name="trophy" size={24} color={COLORS.success} />
                                </View>
                                <Text style={styles.achievementValue}>{stats?.longestStreak || 0}</Text>
                                <Text style={styles.achievementLabel}>Longest Streak</Text>
                            </View>
                        </View>

                        {stats?.lastTaskCompletedDate && (
                            <View style={styles.lastActivityRow}>
                                <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
                                <Text style={styles.lastActivityText}>
                                    Last task completed: {new Date(stats.lastTaskCompletedDate).toLocaleDateString()}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.card}>
                        <View style={styles.sectionHeaderRow}>
                            <Ionicons name="mail" size={20} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>Contact Information</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.infoIcon}>
                                <Ionicons name="mail-outline" size={18} color={COLORS.textLight} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Email</Text>
                                <Text style={styles.infoValue}>{user?.email}</Text>
                            </View>
                        </View>

                        {user?.phoneNumber && (
                            <View style={styles.infoRow}>
                                <View style={styles.infoIcon}>
                                    <Ionicons name="call-outline" size={18} color={COLORS.textLight} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Phone</Text>
                                    <Text style={styles.infoValue}>{user.phoneNumber}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.card}>
                        <View style={styles.sectionHeaderRow}>
                            <Ionicons name="stats-chart" size={20} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>Performance Overview</Text>
                        </View>

                        <View style={styles.statsList}>
                            <View style={styles.statItem}>
                                <View style={styles.statLeft}>
                                    <View style={[styles.statIndicator, { backgroundColor: COLORS.success }]} />
                                    <Text style={styles.statLabel}>Tasks Completed</Text>
                                </View>
                                <Text style={styles.statValue}>{stats?.tasksCompleted || 0}</Text>
                            </View>

                            <View style={styles.statItem}>
                                <View style={styles.statLeft}>
                                    <View style={[styles.statIndicator, { backgroundColor: COLORS.primary }]} />
                                    <Text style={styles.statLabel}>In Progress</Text>
                                </View>
                                <Text style={styles.statValue}>{stats?.tasksInProgress || 0}</Text>
                            </View>

                            <View style={styles.statItem}>
                                <View style={styles.statLeft}>
                                    <View style={[styles.statIndicator, { backgroundColor: COLORS.danger }]} />
                                    <Text style={styles.statLabel}>Overdue</Text>
                                </View>
                                <Text style={styles.statValue}>{stats?.tasksOverdue || 0}</Text>
                            </View>

                            {stats && stats.tasksCompleted > 0 && (
                                <View style={styles.completionRate}>
                                    <Text style={styles.completionRateText}>
                                        Completion Rate:{" "}
                                        <Text style={styles.completionRateValue}>
                                            {Math.round(
                                                (stats.tasksCompleted / (stats.tasksCompleted + (stats.tasksInProgress || 1))) * 100
                                            )}%
                                        </Text>
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
                        <Text style={styles.logoutButtonText}>Disconnect Account</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <Modal
                visible={showEditModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowEditModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.formGroup}>
                                <Text style={styles.inputLabel}>First Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editedFirstName}
                                    onChangeText={setEditedFirstName}
                                    placeholder="Enter first name"
                                    placeholderTextColor={COLORS.textLight}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.inputLabel}>Last Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editedLastName}
                                    onChangeText={setEditedLastName}
                                    placeholder="Enter last name"
                                    placeholderTextColor={COLORS.textLight}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.inputLabel}>Status</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editedStatus}
                                    onChangeText={setEditedStatus}
                                    placeholder="e.g., Available, Busy, In a meeting"
                                    placeholderTextColor={COLORS.textLight}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.inputLabel}>Phone Number</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editedPhoneNumber}
                                    onChangeText={setEditedPhoneNumber}
                                    placeholder="Enter phone number"
                                    placeholderTextColor={COLORS.textLight}
                                    keyboardType="phone-pad"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.inputLabel}>Bio</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={editedBio}
                                    onChangeText={setEditedBio}
                                    placeholder="Tell us about yourself..."
                                    placeholderTextColor={COLORS.textLight}
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowEditModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleUpdateProfile}>
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    centerContent: {
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: COLORS.textLight,
    },
    content: {
        flex: 1,
    },
    headerCard: {
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingTop: 60,
        paddingBottom: 24,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 24,
    },
    avatarContainer: {
        position: "relative",
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 3,
        borderColor: COLORS.white,
    },
    avatarText: {
        fontSize: 28,
        fontWeight: "bold",
        color: COLORS.white,
    },
    statusIndicator: {
        position: "absolute",
        bottom: 2,
        right: 2,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: COLORS.white,
        alignItems: "center",
        justifyContent: "center",
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    headerInfo: {
        flex: 1,
        marginLeft: 16,
    },
    userName: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.white,
        marginBottom: 4,
    },
    roleContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },
    userRole: {
        fontSize: 14,
        color: "rgba(255,255,255,0.9)",
        marginLeft: 6,
    },
    departmentBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: "flex-start",
        marginBottom: 6,
    },
    departmentText: {
        fontSize: 11,
        color: COLORS.white,
        fontWeight: "600",
        marginLeft: 4,
    },
    statusText: {
        fontSize: 12,
        color: "rgba(255,255,255,0.8)",
        fontStyle: "italic",
    },
    editButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    quickStats: {
        flexDirection: "row",
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 16,
        padding: 16,
    },
    quickStatItem: {
        flex: 1,
        alignItems: "center",
    },
    streakIconContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    quickStatValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.white,
        marginBottom: 4,
        marginLeft: 4,
    },
    quickStatLabel: {
        fontSize: 12,
        color: "rgba(255,255,255,0.8)",
    },
    statDivider: {
        width: 1,
        backgroundColor: "rgba(255,255,255,0.2)",
        marginHorizontal: 8,
    },
    section: {
        paddingHorizontal: 16,
        marginTop: 16,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    bioCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.text,
        marginLeft: 8,
    },
    bioText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    contributionHeader: {
        marginBottom: 16,
    },
    contributionSubtext: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 4,
    },
    graphScroll: {
        marginBottom: 12,
    },
    contributionGraph: {
        flexDirection: "row",
    },
    weekDays: {
        marginRight: 8,
        justifyContent: "space-between",
        paddingVertical: 2,
    },
    weekDayLabel: {
        fontSize: 9,
        color: COLORS.textLight,
        height: 11,
    },
    graphContainer: {
        flexDirection: "row",
        gap: 3,
    },
    week: {
        gap: 3,
    },
    day: {
        width: 11,
        height: 11,
        borderRadius: 2,
    },
    contributionLegend: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 4,
        marginTop: 8,
    },
    legendText: {
        fontSize: 10,
        color: COLORS.textLight,
    },
    legendBox: {
        width: 11,
        height: 11,
        borderRadius: 2,
    },
    achievementGrid: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    achievementCard: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
    },
    achievementIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    achievementValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.text,
        marginBottom: 4,
    },
    achievementLabel: {
        fontSize: 12,
        color: COLORS.textLight,
        textAlign: "center",
    },
    lastActivityRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    lastActivityText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginLeft: 6,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    infoIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.background,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: COLORS.textLight,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: "500",
    },
    statsList: {
        gap: 16,
    },
    statItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    statLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    statIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 12,
    },
    statLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    statValue: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.text,
    },
    completionRate: {
        marginTop: 8,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    completionRateText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: "center",
    },
    completionRateValue: {
        fontWeight: "bold",
        color: COLORS.primary,
        fontSize: 16,
    },
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 8,
    },
    logoutButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.danger,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: "90%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.text,
    },
    formGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: COLORS.text,
        backgroundColor: COLORS.background,
    },
    textArea: {
        height: 100,
        textAlignVertical: "top",
    },
    modalButtons: {
        flexDirection: "row",
        gap: 12,
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cancelButtonText: {
        color: COLORS.textSecondary,
        fontSize: 16,
        fontWeight: "600",
    },
    saveButton: {
        backgroundColor: COLORS.primary,
    },
    saveButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: "600",
    },
});