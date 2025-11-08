import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { IP } from "@/data/ip";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

const COLORS = {
  primary: "#2563EB",
  white: "#FFFFFF",
  background: "#F8FAFC",
  text: "#0F172A",
  textSecondary: "#475569",
  textLight: "#64748B",
  border: "#E2E8F0",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

const PRIORITY_COLORS = {
  Low: "#10B981",
  Medium: "#3B82F6",
  High: "#F59E0B",
  Urgent: "#EF4444",
};

const STATUS_COLORS = {
  Open: "#64748B",
  "In Progress": "#3B82F6",
  "Under Review": "#F59E0B",
  Completed: "#10B981",
  Blocked: "#EF4444",
  Cancelled: "#64748B",
  Pending: "#F59E0B",
};

interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  color: string;
  department: string;
  dueDate: string;
  createdBy: {
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
  assignedTo: any[];
  assignedGroups: any[];
  tags: string[];
  isOpenForClaims: boolean;
  isClaimed: boolean;
}

export default function MyTasks() {
  const { user } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadMyTasks();
  }, []);

  const loadMyTasks = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.get(`http://${IP}:5555/tasks/user/${user?._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(response.data);
    } catch (error) {
      console.error("Error loading my tasks:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMyTasks();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    return `${diffDays}d left`;
  };

  const getFilteredTasks = () => {
    if (filter === "all") return tasks;
    return tasks.filter((task) => task.status === filter);
  };

  const filteredTasks = getFilteredTasks();

  const taskCounts = {
    all: tasks.length,
    Open: tasks.filter((t) => t.status === "Open").length,
    "In Progress": tasks.filter((t) => t.status === "In Progress").length,
    "Under Review": tasks.filter((t) => t.status === "Under Review").length,
    Completed: tasks.filter((t) => t.status === "Completed").length,
  };

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === "all" && styles.filterButtonActive]}
          onPress={() => setFilter("all")}
        >
          <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>
            All ({taskCounts.all})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === "Open" && styles.filterButtonActive]}
          onPress={() => setFilter("Open")}
        >
          <Text style={[styles.filterText, filter === "Open" && styles.filterTextActive]}>
            Open ({taskCounts.Open})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === "In Progress" && styles.filterButtonActive]}
          onPress={() => setFilter("In Progress")}
        >
          <Text style={[styles.filterText, filter === "In Progress" && styles.filterTextActive]}>
            In Progress ({taskCounts["In Progress"]})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === "Under Review" && styles.filterButtonActive]}
          onPress={() => setFilter("Under Review")}
        >
          <Text style={[styles.filterText, filter === "Under Review" && styles.filterTextActive]}>
            Review ({taskCounts["Under Review"]})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === "Completed" && styles.filterButtonActive]}
          onPress={() => setFilter("Completed")}
        >
          <Text style={[styles.filterText, filter === "Completed" && styles.filterTextActive]}>
            Completed ({taskCounts.Completed})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Tasks List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={loading || filteredTasks.length === 0 ? styles.contentCenter : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading your tasks...</Text>
          </View>
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No tasks found</Text>
            <Text style={styles.emptySubtext}>
              {filter === "all"
                ? "You don't have any assigned tasks yet"
                : `No ${filter.toLowerCase()} tasks`}
            </Text>
          </View>
        ) : (
          <View style={styles.tasksContainer}>
            {filteredTasks.map((task) => (
              <TouchableOpacity
                key={task._id}
                style={[styles.taskCard, { borderLeftColor: task.color }]}
                onPress={() => {
                  console.log("Navigating to task:", task._id);
                  router.push({
                    pathname: "/taskdetails",
                    params: { id: task._id }
                  } as any);
                }}
                activeOpacity={0.7}
              >
                {/* Task Header */}
                <View style={styles.taskHeader}>
                  <View style={styles.taskHeaderLeft}>
                    <View
                      style={[
                        styles.priorityBadge,
                        {
                          backgroundColor:
                            PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS],
                        },
                      ]}
                    >
                      <Text style={styles.priorityBadgeText}>{task.priority}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: STATUS_COLORS[task.status as keyof typeof STATUS_COLORS] },
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>{task.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.taskDueDate}>{formatDate(task.dueDate)}</Text>
                </View>

                {/* Task Title & Description */}
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskDescription} numberOfLines={2}>
                  {task.description}
                </Text>

                {/* Tags */}
                {task.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {task.tags.slice(0, 3).map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>#{tag}</Text>
                      </View>
                    ))}
                    {task.tags.length > 3 && (
                      <Text style={styles.moreTagsText}>+{task.tags.length - 3}</Text>
                    )}
                  </View>
                )}

                {/* Task Footer */}
                <View style={styles.taskFooter}>
                  <View style={styles.taskCreator}>
                    <View style={styles.creatorAvatar}>
                      <Text style={styles.creatorAvatarText}>
                        {task.createdBy.firstName[0]}
                        {task.createdBy.lastName[0]}
                      </Text>
                    </View>
                    <Text style={styles.creatorName}>
                      {task.createdBy.firstName} {task.createdBy.lastName}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filterContainer: {
    flexGrow: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  contentCenter: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
  },
  tasksContainer: {
    padding: 16,
  },
  taskCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  taskHeaderLeft: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  taskDueDate: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: "500",
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 8,
  },
  taskDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "500",
  },
  moreTagsText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: "500",
    alignSelf: "center",
  },
  taskFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  taskCreator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  creatorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  creatorAvatarText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  creatorName: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
});
