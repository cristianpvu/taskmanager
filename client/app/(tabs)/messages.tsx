import { Text, View, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useAuth } from "@/context/AuthContext";

import { IP } from '@/data/ip';

const API_URL = `http://${IP}:5555`;

export default function AdminDashboard() {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalTasks: 0,
        activeTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        inProgressTasks: 0,
        cancelledTasks: 0,
        totalUsers: 0,
        totalGroups: 0,
        criticalTasks: 0,
        highPriorityTasks: 0,
        mediumPriorityTasks: 0,
        lowPriorityTasks: 0,
    });
    const [recentTasks, setRecentTasks] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [departmentStats, setDepartmentStats] = useState([]);
    const [allUsers, setAllUsers] = useState([]);

    const fetchDashboardData = async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            const headers = { Authorization: `Bearer ${token}` };

            let allTasks = [];

            try {
                const userTasksResponse = await axios.get(`${API_URL}/tasks/user/${currentUser?._id}`, { headers });
                allTasks = [...userTasksResponse.data];
            } catch (error) {
                console.log("Could not fetch user tasks");
            }

            try {
                const createdTasksResponse = await axios.get(`${API_URL}/tasks/created-by/${currentUser?._id}`, { headers });
                const createdTasks = createdTasksResponse.data;

                createdTasks.forEach(task => {
                    if (!allTasks.find(t => t._id === task._id)) {
                        allTasks.push(task);
                    }
                });
            } catch (error) {
                console.log("Could not fetch created tasks");
            }

            try {
                const feedResponse = await axios.get(`${API_URL}/tasks/feed`, { headers });
                const feedTasks = feedResponse.data.tasks || feedResponse.data;

                feedTasks.forEach(task => {
                    if (!allTasks.find(t => t._id === task._id)) {
                        allTasks.push(task);
                    }
                });
            } catch (error) {
                console.log("Could not fetch feed tasks");
            }

            const groupsResponse = await axios.get(`${API_URL}/groups`, { headers });
            const allGroups = groupsResponse.data;

            const usersResponse = await axios.get(`${API_URL}/users/search?query=`, { headers });
            const users = usersResponse.data;
            setAllUsers(users);

            const now = new Date();
            const tasksByStatus = {
                total: allTasks.length,
                active: allTasks.filter(t => t.status === 'Active' || t.status === 'Open').length,
                completed: allTasks.filter(t => t.status === 'Completed').length,
                pending: allTasks.filter(t => t.status === 'Pending' || t.status === 'Open').length,
                overdue: allTasks.filter(t =>
                    t.status !== 'Completed' &&
                    t.status !== 'Cancelled' &&
                    new Date(t.dueDate) < now
                ).length,
                inProgress: allTasks.filter(t => t.status === 'In Progress').length,
                cancelled: allTasks.filter(t => t.status === 'Cancelled').length,
            };

            const tasksByPriority = {
                critical: allTasks.filter(t => t.priority === 'Critical').length,
                high: allTasks.filter(t => t.priority === 'High').length,
                medium: allTasks.filter(t => t.priority === 'Medium').length,
                low: allTasks.filter(t => t.priority === 'Low').length,
            };

            const deptStats = {};
            allTasks.forEach(task => {
                if (task.department) {
                    if (!deptStats[task.department]) {
                        deptStats[task.department] = {
                            total: 0,
                            completed: 0,
                            active: 0,
                        };
                    }
                    deptStats[task.department].total++;
                    if (task.status === 'Completed') {
                        deptStats[task.department].completed++;
                    }
                    if (task.status === 'Active' || task.status === 'In Progress') {
                        deptStats[task.department].active++;
                    }
                }
            });

            const departmentArray = Object.keys(deptStats).map(dept => ({
                name: dept,
                ...deptStats[dept],
            }));

            setStats({
                totalTasks: tasksByStatus.total,
                activeTasks: tasksByStatus.active,
                completedTasks: tasksByStatus.completed,
                pendingTasks: tasksByStatus.pending,
                overdueTasks: tasksByStatus.overdue,
                inProgressTasks: tasksByStatus.inProgress,
                cancelledTasks: tasksByStatus.cancelled,
                totalUsers: users.length,
                totalGroups: allGroups.length,
                criticalTasks: tasksByPriority.critical,
                highPriorityTasks: tasksByPriority.high,
                mediumPriorityTasks: tasksByPriority.medium,
                lowPriorityTasks: tasksByPriority.low,
            });

            const sortedTasks = [...allTasks]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 10);
            setRecentTasks(sortedTasks);

            const activities = [];
            sortedTasks.forEach(task => {
                if (task.activityLog && task.activityLog.length > 0) {
                    const latestActivity = task.activityLog[task.activityLog.length - 1];
                    activities.push({
                        id: task._id,
                        task: task.title,
                        user: latestActivity.user,
                        action: latestActivity.type,
                        description: latestActivity.description,
                        time: latestActivity.timestamp,
                    });
                }
            });
            setRecentActivity(activities.slice(0, 8));
            setDepartmentStats(departmentArray);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchDashboardData();
        }, [])
    );

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
    };

    const navigateToUserProfile = (userId) => {
        router.push(`/userprofiles?userId=${userId}` as any);5
    };

    const StatCard = ({ title, value, icon, color, bgColor, subtitle }) => (
        <View style={[styles.statCard, { backgroundColor: bgColor }]}>
            <View style={styles.statCardHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
                    <Ionicons name={icon} size={24} color={color} />
                </View>
                <View style={styles.statCardContent}>
                    <Text style={styles.statValue}>{value}</Text>
                    <Text style={styles.statTitle}>{title}</Text>
                    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
                </View>
            </View>
        </View>
    );

    const UserCard = ({ user }) => {
        const getInitials = () => {
            return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
        };

        const getStatusColor = (status) => {
            if (!status) return '#6B7280';
            if (status.toLowerCase().includes('available')) return '#10B981';
            if (status.toLowerCase().includes('busy')) return '#F59E0B';
            if (status.toLowerCase().includes('away')) return '#6B7280';
            return '#2563EB';
        };

        const getRoleIcon = (role) => {
            switch (role) {
                case 'CEO': return 'business';
                case 'Project Manager': return 'briefcase';
                case 'Team Lead': return 'people';
                case 'Employee': return 'person';
                case 'Intern': return 'school';
                case 'Contractor': return 'hammer';
                default: return 'person';
            }
        };

        return (
            <TouchableOpacity
                style={styles.userCard}
                onPress={() => navigateToUserProfile(user._id)}
                activeOpacity={0.7}
            >
                <View style={styles.userCardHeader}>
                    <View style={styles.userAvatarContainer}>
                        <View style={styles.userAvatar}>
                            <Text style={styles.userAvatarText}>{getInitials()}</Text>
                        </View>
                        <View style={[styles.userStatusDot, { backgroundColor: getStatusColor(user.status) }]} />
                    </View>
                    <View style={styles.userCardInfo}>
                        <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
                        <View style={styles.userRoleContainer}>
                            <Ionicons name={getRoleIcon(user.role)} size={12} color="#6B7280" />
                            <Text style={styles.userRole}>{user.role}</Text>
                        </View>
                        <Text style={styles.userDepartment}>{user.department}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
                {user.status && (
                    <View style={styles.userStatusContainer}>
                        <Text style={styles.userStatusText}>{user.status}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const TaskListItem = ({ task }) => {
        const getPriorityColor = (priority) => {
            switch(priority) {
                case 'Critical': return '#EF4444';
                case 'High': return '#F59E0B';
                case 'Medium': return '#3B82F6';
                case 'Low': return '#10B981';
                default: return '#6B7280';
            }
        };

        const getStatusColor = (status) => {
            switch(status) {
                case 'Completed': return '#DBEAFE';
                case 'In Progress': return '#FEF3C7';
                case 'Active': return '#D1FAE5';
                case 'Overdue': return '#FEE2E2';
                default: return '#F3F4F6';
            }
        };

        const formatDate = (date) => {
            if (!date) return 'No date';
            const d = new Date(date);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        };

        return (
            <View style={styles.taskListItem}>
                <View style={styles.taskListHeader}>
                    <View style={styles.taskListLeft}>
                        <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(task.priority) }]} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.taskListTitle} numberOfLines={1}>{task.title}</Text>
                            <Text style={styles.taskListDepartment}>{task.department || 'No Department'}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                        <Text style={styles.statusText}>{task.status}</Text>
                    </View>
                </View>
                <View style={styles.taskListFooter}>
                    <View style={styles.taskListInfo}>
                        <Ionicons name="person-circle-outline" size={16} color="#6B7280" />
                        <Text style={styles.taskListInfoText}>
                            {task.assignedTo?.length > 0
                                ? `${task.assignedTo.length} assigned`
                                : 'Unassigned'}
                        </Text>
                    </View>
                    <View style={styles.taskListInfo}>
                        <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                        <Text style={styles.taskListInfoText}>{formatDate(task.dueDate)}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const ActivityItem = ({ activity }) => {
        const getActivityIcon = (action) => {
            if (action.includes('created')) return 'add-circle';
            if (action.includes('completed')) return 'checkmark-circle';
            if (action.includes('assigned')) return 'person-add';
            if (action.includes('status')) return 'swap-horizontal';
            return 'alert-circle';
        };

        const getActivityColor = (action) => {
            if (action.includes('created')) return '#2563EB';
            if (action.includes('completed')) return '#10B981';
            if (action.includes('assigned')) return '#8B5CF6';
            if (action.includes('status')) return '#F59E0B';
            return '#6B7280';
        };

        const getTimeAgo = (date) => {
            if (!date) return 'Unknown';
            const seconds = Math.floor((new Date() - new Date(date)) / 1000);

            if (seconds < 60) return 'Just now';
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}m ago`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h ago`;
            const days = Math.floor(hours / 24);
            return `${days}d ago`;
        };

        return (
            <View style={styles.activityItem}>
                <View style={[styles.activityIconContainer, { backgroundColor: getActivityColor(activity.action) + '20' }]}>
                    <Ionicons
                        name={getActivityIcon(activity.action)}
                        size={20}
                        color={getActivityColor(activity.action)}
                    />
                </View>
                <View style={styles.activityContent}>
                    <Text style={styles.activityText}>{activity.description}</Text>
                    <Text style={styles.activityTask} numberOfLines={1}>"{activity.task}"</Text>
                    <Text style={styles.activityTime}>{getTimeAgo(activity.time)}</Text>
                </View>
            </View>
        );
    };

    const DepartmentCard = ({ dept }) => (
        <View style={styles.departmentCard}>
            <View style={styles.departmentHeader}>
                <Text style={styles.departmentName}>{dept.name}</Text>
                <Text style={styles.departmentTotal}>{dept.total} tasks</Text>
            </View>
            <View style={styles.departmentStats}>
                <View style={styles.departmentStat}>
                    <Text style={styles.departmentStatValue}>{dept.active}</Text>
                    <Text style={styles.departmentStatLabel}>Active</Text>
                </View>
                <View style={styles.departmentStat}>
                    <Text style={styles.departmentStatValue}>{dept.completed}</Text>
                    <Text style={styles.departmentStatLabel}>Completed</Text>
                </View>
                <View style={styles.departmentStat}>
                    <Text style={[styles.departmentStatValue, { color: '#10B981' }]}>
                        {dept.total > 0 ? Math.round((dept.completed / dept.total) * 100) : 0}%
                    </Text>
                    <Text style={styles.departmentStatLabel}>Success</Text>
                </View>
            </View>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loadingText}>Loading Dashboard...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#2563EB', '#1E40AF']}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.headerTitle}>Admin Dashboard</Text>
                        <Text style={styles.headerSubtitle}>Company Overview</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.headerButton} onPress={onRefresh}>
                            <Ionicons name="refresh" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={styles.statsRow}>
                    <StatCard
                        title="Total Tasks"
                        value={stats.totalTasks}
                        icon="list"
                        color="#2563EB"
                        bgColor="#FFFFFF"
                        subtitle="All tasks"
                    />
                    <StatCard
                        title="Active"
                        value={stats.activeTasks}
                        icon="play-circle"
                        color="#10B981"
                        bgColor="#FFFFFF"
                        subtitle="In progress"
                    />
                </View>

                <View style={styles.statsRow}>
                    <StatCard
                        title="Completed"
                        value={stats.completedTasks}
                        icon="checkmark-done-circle"
                        color="#8B5CF6"
                        bgColor="#FFFFFF"
                        subtitle="Finished"
                    />
                    <StatCard
                        title="Overdue"
                        value={stats.overdueTasks}
                        icon="alert-circle"
                        color="#EF4444"
                        bgColor="#FFFFFF"
                        subtitle="Past deadline"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Priority Distribution</Text>
                    <View style={styles.priorityGrid}>
                        <View style={[styles.priorityCard, { backgroundColor: '#FEE2E2' }]}>
                            <Ionicons name="flame" size={24} color="#EF4444" />
                            <Text style={styles.priorityValue}>{stats.criticalTasks}</Text>
                            <Text style={styles.priorityLabel}>Critical</Text>
                        </View>
                        <View style={[styles.priorityCard, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="warning" size={24} color="#F59E0B" />
                            <Text style={styles.priorityValue}>{stats.highPriorityTasks}</Text>
                            <Text style={styles.priorityLabel}>High</Text>
                        </View>
                        <View style={[styles.priorityCard, { backgroundColor: '#DBEAFE' }]}>
                            <Ionicons name="arrow-up" size={24} color="#3B82F6" />
                            <Text style={styles.priorityValue}>{stats.mediumPriorityTasks}</Text>
                            <Text style={styles.priorityLabel}>Medium</Text>
                        </View>
                        <View style={[styles.priorityCard, { backgroundColor: '#D1FAE5' }]}>
                            <Ionicons name="arrow-down" size={24} color="#10B981" />
                            <Text style={styles.priorityValue}>{stats.lowPriorityTasks}</Text>
                            <Text style={styles.priorityLabel}>Low</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.metricsContainer}>
                    <View style={styles.metricCard}>
                        <View style={styles.metricHeader}>
                            <Ionicons name="people" size={24} color="#2563EB" />
                            <Text style={styles.metricValue}>{stats.totalUsers}</Text>
                        </View>
                        <Text style={styles.metricLabel}>Total Users</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <View style={styles.metricHeader}>
                            <Ionicons name="people-circle" size={24} color="#8B5CF6" />
                            <Text style={styles.metricValue}>{stats.totalGroups}</Text>
                        </View>
                        <Text style={styles.metricLabel}>Groups</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <View style={styles.metricHeader}>
                            <Ionicons name="hourglass" size={24} color="#F59E0B" />
                            <Text style={styles.metricValue}>{stats.inProgressTasks}</Text>
                        </View>
                        <Text style={styles.metricLabel}>In Progress</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>All Users ({allUsers.length})</Text>
                        <Text style={styles.sectionSubtitle}>Tap to view profile</Text>
                    </View>
                    {allUsers.length > 0 ? (
                        allUsers.map(user => (
                            <UserCard key={user._id} user={user} />
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No users found</Text>
                    )}
                </View>

                {departmentStats.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Department Statistics</Text>
                        {departmentStats.map((dept, index) => (
                            <DepartmentCard key={index} dept={dept} />
                        ))}
                    </View>
                )}

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Tasks</Text>
                    </View>
                    {recentTasks.length > 0 ? (
                        recentTasks.slice(0, 5).map(task => (
                            <TaskListItem key={task._id} task={task} />
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No tasks available</Text>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    <View style={styles.activityContainer}>
                        {recentActivity.length > 0 ? (
                            recentActivity.map((activity, index) => (
                                <ActivityItem key={index} activity={activity} />
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No recent activity</Text>
                        )}
                    </View>
                </View>

                <View style={styles.bottomPadding} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 30,
        paddingHorizontal: 24,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 4,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    headerButton: {
        padding: 8,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    statCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statCardContent: {
        flex: 1,
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    statTitle: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
    },
    statSubtitle: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 16,
    },
    sectionSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    userCard: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    userCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    userAvatarContainer: {
        position: 'relative',
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#2563EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userAvatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    userStatusDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    userCardInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    userRoleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    userRole: {
        fontSize: 13,
        color: '#6B7280',
    },
    userDepartment: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    userStatusContainer: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    userStatusText: {
        fontSize: 13,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    priorityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    priorityCard: {
        flex: 1,
        minWidth: '47%',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    priorityValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginTop: 8,
    },
    priorityLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    metricsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    metricCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    metricHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    metricValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    metricLabel: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
    },
    departmentCard: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    departmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    departmentName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    departmentTotal: {
        fontSize: 14,
        color: '#6B7280',
    },
    departmentStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    departmentStat: {
        alignItems: 'center',
    },
    departmentStatValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2563EB',
    },
    departmentStatLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    taskListItem: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    taskListHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    taskListLeft: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        flex: 1,
    },
    priorityIndicator: {
        width: 4,
        height: 40,
        borderRadius: 2,
        marginTop: 2,
    },
    taskListTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    taskListDepartment: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#1F2937',
    },
    taskListFooter: {
        flexDirection: 'row',
        gap: 16,
    },
    taskListInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    taskListInfoText: {
        fontSize: 13,
        color: '#6B7280',
    },
    activityContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    activityItem: {
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    activityIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityContent: {
        flex: 1,
    },
    activityText: {
        fontSize: 14,
        color: '#1F2937',
    },
    activityTask: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    activityTime: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
    },
    emptyText: {
        textAlign: 'center',
        color: '#9CA3AF',
        fontSize: 14,
        paddingVertical: 20,
    },
    bottomPadding: {
        height: 20,
    },
});