import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { IP } from "@/data/ip";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const STATUSES = ["Open", "In Progress", "Under Review", "Completed", "Blocked", "Cancelled", "Pending"];

interface ChecklistItem {
  _id: string;
  text: string;
  isCompleted: boolean;
  createdAt: string;
  completedAt?: string;
}

interface Subtask {
  _id: string;
  title: string;
  status: string;
  priority: string;
  progressPercentage: number;
  assignedTo: any[];
}

interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  color: string;
  department: string;
  dueDate: string;
  startDate: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
  assignedTo: any[];
  assignedGroups: any[];
  tags: string[];
  isOpenForClaims: boolean;
  isClaimed: boolean;
  progressPercentage: number;
  checklist: ChecklistItem[];
  subtasks: Subtask[];
  parentTask?: {
    _id: string;
    title: string;
  };
  createdAt: string;
}

interface Comment {
  _id: string;
  content: string;
  author: {
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
  createdAt: string;
}

export default function TaskDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [addingChecklistItem, setAddingChecklistItem] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [creatingSubtask, setCreatingSubtask] = useState(false);

  useEffect(() => {
    loadTaskDetails();
    loadComments();
  }, [id]);

  const loadTaskDetails = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.get(`http://${IP}:5555/task/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Initialize checklist if it doesn't exist (for old tasks)
      const taskData = response.data;
      if (!taskData.checklist) {
        taskData.checklist = [];
      }
      setTask(taskData);
    } catch (error) {
      console.error("Error loading task:", error);
      Alert.alert("Error", "Failed to load task details");
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.get(`http://${IP}:5555/comments/task/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments(response.data);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      await axios.put(
        `http://${IP}:5555/task/${id}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTask((prev) => (prev ? { ...prev, status: newStatus } : null));
      setShowStatusModal(false);
      Alert.alert("Success", "Status updated successfully");
    } catch (error) {
      console.error("Error updating status:", error);
      Alert.alert("Error", "Failed to update status");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      Alert.alert("Error", "Please enter a comment");
      return;
    }

    try {
      setSendingComment(true);
      const token = await AsyncStorage.getItem("authToken");
      await axios.post(
        `http://${IP}:5555/comment/create`,
        { taskId: id, content: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewComment("");
      loadComments();
      Alert.alert("Success", "Comment added successfully");
    } catch (error) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", "Failed to add comment");
    } finally {
      setSendingComment(false);
    }
  };

  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim()) {
      Alert.alert("Error", "Please enter a checklist item");
      return;
    }

    try {
      setAddingChecklistItem(true);
      const token = await AsyncStorage.getItem("authToken");
      await axios.post(
        `http://${IP}:5555/task/${id}/checklist/add`,
        { text: newChecklistItem },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewChecklistItem("");
      // Reload task to get fully populated data
      loadTaskDetails();
    } catch (error) {
      console.error("Error adding checklist item:", error);
      Alert.alert("Error", "Failed to add checklist item");
    } finally {
      setAddingChecklistItem(false);
    }
  };

  const handleToggleChecklistItem = async (itemId: string) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      await axios.put(
        `http://${IP}:5555/task/${id}/checklist/${itemId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Reload task to get fully populated data
      loadTaskDetails();
    } catch (error) {
      console.error("Error toggling checklist item:", error);
      Alert.alert("Error", "Failed to update checklist item");
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      await axios.delete(
        `http://${IP}:5555/task/${id}/checklist/${itemId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Reload task to get fully populated data
      loadTaskDetails();
    } catch (error) {
      console.error("Error deleting checklist item:", error);
      Alert.alert("Error", "Failed to delete checklist item");
    }
  };

  const handleCreateSubtask = async () => {
    if (!newSubtaskTitle.trim()) {
      Alert.alert("Error", "Please enter a subtask title");
      return;
    }

    try {
      setCreatingSubtask(true);
      const token = await AsyncStorage.getItem("authToken");
      await axios.post(
        `http://${IP}:5555/task/${id}/subtask`,
        { title: newSubtaskTitle },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewSubtaskTitle("");
      loadTaskDetails();
    } catch (error) {
      console.error("Error creating subtask:", error);
      Alert.alert("Error", "Failed to create subtask");
    } finally {
      setCreatingSubtask(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ro-RO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading task details...</Text>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.danger} />
        <Text style={styles.errorText}>Task not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isAssigned = task.assignedTo.some((u: any) => u._id === user?._id);
  const isCreator = task.createdBy._id === user?._id;
  const canEdit = isAssigned || isCreator;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Details</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content}>
        {/* Parent Task Reference */}
        {task.parentTask && (
          <TouchableOpacity
            style={styles.parentTaskBanner}
            onPress={() => router.push({ pathname: "/taskdetails", params: { id: task.parentTask?._id || "" } })}
          >
            <Ionicons name="git-branch-outline" size={20} color={COLORS.primary} />
            <View style={styles.parentTaskInfo}>
              <Text style={styles.parentTaskLabel}>Part of</Text>
              <Text style={styles.parentTaskTitle}>{task.parentTask?.title || ""}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {/* Task Header */}
        <View style={[styles.taskHeader, { borderLeftColor: task.color }]}>
          <View style={styles.taskHeaderTop}>
            <View style={styles.badges}>
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] },
                ]}
              >
                <Text style={styles.badgeText}>{task.priority}</Text>
              </View>
              <TouchableOpacity
                style={styles.statusBadge}
                onPress={() => canEdit && setShowStatusModal(true)}
                disabled={!canEdit}
              >
                <Text style={styles.statusBadgeText}>{task.status}</Text>
                {canEdit && <Ionicons name="chevron-down" size={16} color={COLORS.white} />}
              </TouchableOpacity>
            </View>
            <Text style={styles.department}>{task.department}</Text>
          </View>
          
          <Text style={styles.title}>{task.title}</Text>
          <Text style={styles.description}>{task.description}</Text>

          {/* Tags */}
          {task.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {task.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Task Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.textLight} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Start Date</Text>
              <Text style={styles.infoValue}>{formatDate(task.startDate)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="flag-outline" size={20} color={COLORS.textLight} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Due Date</Text>
              <Text style={styles.infoValue}>{formatDate(task.dueDate)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color={COLORS.textLight} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Created By</Text>
              <Text style={styles.infoValue}>
                {task.createdBy.firstName} {task.createdBy.lastName}
              </Text>
            </View>
          </View>

          {task.assignedTo.length > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={20} color={COLORS.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Assigned To</Text>
                <View style={styles.assignedList}>
                  {task.assignedTo.map((person: any, index: number) => (
                    <View key={index} style={styles.assignedPerson}>
                      <View style={styles.smallAvatar}>
                        <Text style={styles.smallAvatarText}>
                          {person.firstName[0]}
                          {person.lastName[0]}
                        </Text>
                      </View>
                      <Text style={styles.assignedName}>
                        {person.firstName} {person.lastName}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="stats-chart-outline" size={20} color={COLORS.textLight} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Progress</Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${task.progressPercentage}%` }]} />
                </View>
                <Text style={styles.progressText}>{task.progressPercentage}%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Checklist Section */}
        <View style={styles.checklistSection}>
          <Text style={styles.sectionTitle}>
            Checklist ({task.checklist?.filter(item => item.isCompleted).length || 0}/{task.checklist?.length || 0})
          </Text>

          {/* Add Checklist Item */}
          {canEdit && (
            <View style={styles.addChecklistContainer}>
              <TextInput
                style={styles.checklistInput}
                placeholder="Add a to-do item..."
                value={newChecklistItem}
                onChangeText={setNewChecklistItem}
                placeholderTextColor={COLORS.textLight}
                onSubmitEditing={handleAddChecklistItem}
              />
              <TouchableOpacity
                style={styles.addChecklistButton}
                onPress={handleAddChecklistItem}
                disabled={addingChecklistItem}
              >
                {addingChecklistItem ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Ionicons name="add" size={20} color={COLORS.white} />
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Checklist Items */}
          {!task.checklist || task.checklist.length === 0 ? (
            <View style={styles.emptyChecklist}>
              <Ionicons name="checkbox-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyChecklistText}>No checklist items yet</Text>
            </View>
          ) : (
            <View style={styles.checklistItems}>
              {(task.checklist || []).map((item) => (
                <View key={item._id} style={styles.checklistItem}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => handleToggleChecklistItem(item._id)}
                    disabled={!canEdit}
                  >
                    <Ionicons
                      name={item.isCompleted ? "checkbox" : "square-outline"}
                      size={24}
                      color={item.isCompleted ? COLORS.success : COLORS.textLight}
                    />
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.checklistItemText,
                      item.isCompleted && styles.checklistItemTextCompleted,
                    ]}
                  >
                    {item.text}
                  </Text>
                  {canEdit && (
                    <TouchableOpacity
                      style={styles.deleteChecklistButton}
                      onPress={() => handleDeleteChecklistItem(item._id)}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Subtasks Section */}
        <View style={styles.subtasksSection}>
          <Text style={styles.sectionTitle}>
            Subtasks ({task.subtasks?.length || 0})
          </Text>

          {/* Add Subtask */}
          {canEdit && (
            <View style={styles.addSubtaskContainer}>
              <TextInput
                style={styles.subtaskInput}
                placeholder="Add a subtask..."
                value={newSubtaskTitle}
                onChangeText={setNewSubtaskTitle}
                placeholderTextColor={COLORS.textLight}
                onSubmitEditing={handleCreateSubtask}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.addSubtaskButton}
                onPress={handleCreateSubtask}
                disabled={creatingSubtask}
              >
                {creatingSubtask ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Ionicons name="add" size={20} color={COLORS.white} />
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Subtasks List */}
          {!task.subtasks || task.subtasks.length === 0 ? (
            <View style={styles.emptySubtasks}>
              <Ionicons name="git-branch-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptySubtasksText}>No subtasks yet</Text>
            </View>
          ) : (
            <View style={styles.subtasksList}>
              {task.subtasks.map((subtask) => (
                <TouchableOpacity
                  key={subtask._id}
                  style={styles.subtaskCard}
                  onPress={() => router.push({ pathname: "/taskdetails", params: { id: subtask._id } })}
                >
                  <View style={styles.subtaskHeader}>
                    <Ionicons name="git-branch-outline" size={16} color={COLORS.textLight} />
                    <Text style={styles.subtaskTitle}>{subtask.title}</Text>
                  </View>
                  
                  <View style={styles.subtaskMeta}>
                    <View style={styles.subtaskStatus}>
                      <Text style={styles.subtaskStatusText}>{subtask.status}</Text>
                    </View>
                    <View style={styles.subtaskPriority}>
                      <View
                        style={[
                          styles.priorityDot,
                          { backgroundColor: PRIORITY_COLORS[subtask.priority as keyof typeof PRIORITY_COLORS] },
                        ]}
                      />
                      <Text style={styles.subtaskPriorityText}>{subtask.priority}</Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.subtaskProgressContainer}>
                    <View style={styles.subtaskProgressBar}>
                      <View
                        style={[
                          styles.subtaskProgressFill,
                          { width: `${subtask.progressPercentage}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.subtaskProgressText}>{subtask.progressPercentage}%</Text>
                  </View>

                  {/* Assigned Users */}
                  {subtask.assignedTo && subtask.assignedTo.length > 0 && (
                    <View style={styles.subtaskAssigned}>
                      <Ionicons name="people-outline" size={14} color={COLORS.textLight} />
                      <Text style={styles.subtaskAssignedText}>
                        {subtask.assignedTo.length} assigned
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>

          {/* Add Comment */}
          {canEdit && (
            <View style={styles.addCommentContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                value={newComment}
                onChangeText={setNewComment}
                placeholderTextColor={COLORS.textLight}
                multiline
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleAddComment}
                disabled={sendingComment}
              >
                {sendingComment ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Ionicons name="send" size={20} color={COLORS.white} />
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Comments List */}
          {comments.length === 0 ? (
            <View style={styles.emptyComments}>
              <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyCommentsText}>No comments yet</Text>
            </View>
          ) : (
            comments.map((comment) => (
              <View key={comment._id} style={styles.comment}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>
                    {comment.author.firstName[0]}
                    {comment.author.lastName[0]}
                  </Text>
                </View>
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>
                      {comment.author.firstName} {comment.author.lastName}
                    </Text>
                    <Text style={styles.commentTime}>{formatRelativeTime(comment.createdAt)}</Text>
                  </View>
                  <Text style={styles.commentText}>{comment.content}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Status Change Modal */}
      <Modal visible={showStatusModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Status</Text>
            {STATUSES.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusOption,
                  task.status === status && styles.statusOptionActive,
                ]}
                onPress={() => handleStatusChange(status)}
              >
                <Text
                  style={[
                    styles.statusOptionText,
                    task.status === status && styles.statusOptionTextActive,
                  ]}
                >
                  {status}
                </Text>
                {task.status === status && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowStatusModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 16,
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  taskHeader: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  taskHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  department: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: "500",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "500",
  },
  infoSection: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "500",
  },
  assignedList: {
    gap: 8,
  },
  assignedPerson: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  smallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  smallAvatarText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "600",
  },
  assignedName: {
    fontSize: 14,
    color: COLORS.text,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    minWidth: 40,
  },
  checklistSection: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 12,
  },
  addChecklistContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  checklistInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  addChecklistButton: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyChecklist: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyChecklistText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 12,
  },
  checklistItems: {
    gap: 12,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkbox: {
    padding: 4,
  },
  checklistItemText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  checklistItemTextCompleted: {
    textDecorationLine: "line-through",
    color: COLORS.textLight,
  },
  deleteChecklistButton: {
    padding: 4,
  },
  commentsSection: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 16,
  },
  addCommentContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyComments: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyCommentsText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 12,
  },
  comment: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "600",
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  commentTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  commentText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 20,
  },
  statusOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  statusOptionActive: {
    backgroundColor: COLORS.primary + "20",
  },
  statusOptionText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "500",
  },
  statusOptionTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  cancelButton: {
    marginTop: 12,
    padding: 16,
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  // Subtasks styles
  subtasksSection: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  addSubtaskContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  subtaskInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  addSubtaskButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  emptySubtasks: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptySubtasksText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 12,
  },
  subtasksList: {
    gap: 12,
  },
  subtaskCard: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subtaskHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  subtaskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  subtaskMeta: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  subtaskStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: COLORS.primary + "20",
    borderRadius: 6,
  },
  subtaskStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  subtaskPriority: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: COLORS.white,
    borderRadius: 6,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subtaskPriorityText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  subtaskProgressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  subtaskProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  subtaskProgressFill: {
    height: "100%",
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  subtaskProgressText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    minWidth: 35,
    textAlign: "right",
  },
  subtaskAssigned: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  subtaskAssignedText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  // Parent task styles
  parentTaskBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary + "10",
    padding: 12,
    marginBottom: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + "30",
  },
  parentTaskInfo: {
    flex: 1,
  },
  parentTaskLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 2,
  },
  parentTaskTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
});
