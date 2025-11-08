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
import { decryptText, encryptText } from "@/utils/encryption";

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

interface ReassignHistory {
  _id: string;
  reassignedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
  reassignedTo: {
    _id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
  reassignedAt: string;
  reason: string;
}

interface Task {
  _id: string;
  title: string;
  titleEncrypted?: string;
  description: string;
  descriptionEncrypted?: string;
  encryptedForGroups?: string[];
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
  reassignCount: number;
  reassignHistory: ReassignHistory[];
  createdAt: string;
}

interface Comment {
  _id: string;
  content: string;
  contentEncrypted?: string;
  author: {
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
  createdAt: string;
}

const ROLE_HIERARCHY: { [key: string]: string[] } = {
  "CEO": ["Project Manager", "Team Lead", "Employee", "Intern", "Contractor"],
  "Project Manager": ["Team Lead", "Employee", "Intern", "Contractor"],
  "Team Lead": ["Employee", "Intern", "Contractor"],
  "Employee": [],
  "Intern": [],
  "Contractor": []
};

const SUBTASK_MANAGER_ROLES = ["CEO", "Project Manager", "Team Lead"];

const canAssignToRole = (userRole: string, targetRole: string): boolean => {
  return ROLE_HIERARCHY[userRole]?.includes(targetRole) || false;
};

const filterAssignableUsers = (users: User[], currentUserRole: string): User[] => {
  const assignableRoles = ROLE_HIERARCHY[currentUserRole] || [];
  return users.filter(user => assignableRoles.includes(user.role));
};

export default function TaskDetails() {
  const params = useLocalSearchParams();
  const { id, returnToGroup } = params;
  const router = useRouter();
  const { user } = useAuth();
  
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [addingChecklistItem, setAddingChecklistItem] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  const [showLinkTaskModal, setShowLinkTaskModal] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [linkingTask, setLinkingTask] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [reassignReason, setReassignReason] = useState("");

  useEffect(() => {
    loadTaskDetails();
    loadComments();
    loadActivityLog();
  }, [id]);

  const loadTaskDetails = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.get(`http://${IP}:5555/task/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const taskData = response.data;
      if (!taskData.checklist) {
        taskData.checklist = [];
      }

      // Decrypt if encrypted and user is not CEO
      if (taskData.titleEncrypted && !taskData.title) {
        try {
          // Get encryption key from the first assigned group
          if (taskData.assignedGroups && taskData.assignedGroups.length > 0) {
            const groupId = taskData.assignedGroups[0]._id || taskData.assignedGroups[0];
            const keyResponse = await axios.get(
              `http://${IP}:5555/group/${groupId}/encryption-key`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            const encryptionKey = keyResponse.data.encryptionKey;
            
            // Decrypt title and description
            taskData.title = await decryptText(taskData.titleEncrypted, encryptionKey);
            taskData.description = await decryptText(taskData.descriptionEncrypted, encryptionKey);
          }
        } catch (decError) {
          console.error("Decryption error:", decError);
          taskData.title = "[Encrypted]";
          taskData.description = "[Encrypted content - Unable to decrypt]";
        }
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
      
      const commentsData = response.data;

      // Decrypt comments if needed
      const decryptedComments = await Promise.all(
        commentsData.map(async (comment: any) => {
          if (comment.contentEncrypted && !comment.content) {
            try {
              // Get task to find encryption key
              const taskResponse = await axios.get(`http://${IP}:5555/task/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const taskData = taskResponse.data;
              
              if (taskData.assignedGroups && taskData.assignedGroups.length > 0) {
                const groupId = taskData.assignedGroups[0]._id || taskData.assignedGroups[0];
                const keyResponse = await axios.get(
                  `http://${IP}:5555/group/${groupId}/encryption-key`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                
                const encryptionKey = keyResponse.data.encryptionKey;
                comment.content = await decryptText(comment.contentEncrypted, encryptionKey);
              }
            } catch (decError) {
              console.error("Comment decryption error:", decError);
              comment.content = "[Encrypted]";
            }
          }
          return comment;
        })
      );

      setComments(decryptedComments);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const loadActivityLog = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.get(`http://${IP}:5555/task/${id}/activity-log`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActivityLog(response.data);
    } catch (error) {
      console.error("Error loading activity log:", error);
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
      loadActivityLog(); // Reload activity log
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

      const payload: any = {
        taskId: id,
        content: newComment,
      };

      if (task?.titleEncrypted && task?.assignedGroups && task.assignedGroups.length > 0) {
        try {
          const groupId = task.assignedGroups[0]._id || task.assignedGroups[0];
          const keyResponse = await axios.get(
            `http://${IP}:5555/group/${groupId}/encryption-key`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          const encryptionKey = keyResponse.data.encryptionKey;
          payload.contentEncrypted = await encryptText(newComment, encryptionKey);
        } catch (encError) {
          console.error("Comment encryption error:", encError);
        }
      }

      await axios.post(
        `http://${IP}:5555/comment/create`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewComment("");
      loadComments();
      loadActivityLog(); // Reload activity log
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
      loadTaskDetails();
      loadActivityLog();
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
      loadTaskDetails();
      loadActivityLog();
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
      loadTaskDetails();
      loadActivityLog();
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
      loadActivityLog();
    } catch (error) {
      console.error("Error creating subtask:", error);
      Alert.alert("Error", "Failed to create subtask");
    } finally {
      setCreatingSubtask(false);
    }
  };

  const loadAvailableTasks = async () => {
    try {
      setLoadingTasks(true);
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.get(
        `http://${IP}:5555/task/${id}/available-subtasks`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAvailableTasks(response.data);
    } catch (error) {
      console.error("Error loading available tasks:", error);
      Alert.alert("Error", "Failed to load available tasks");
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleLinkTask = async (taskId: string) => {
    try {
      setLinkingTask(true);
      const token = await AsyncStorage.getItem("authToken");
      await axios.post(
        `http://${IP}:5555/task/${id}/subtask/link`,
        { subtaskId: taskId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowLinkTaskModal(false);
      loadTaskDetails();
      loadActivityLog();
      Alert.alert("Success", "Task linked successfully");
    } catch (error: any) {
      console.error("Error linking task:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to link task");
    } finally {
      setLinkingTask(false);
    }
  };

  const handleUnlinkSubtask = async (subtaskId: string) => {
    Alert.alert(
      "Unlink Subtask",
      "Are you sure you want to unlink this subtask? It will become an independent task.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlink",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("authToken");
              await axios.delete(
                `http://${IP}:5555/task/${id}/subtask/${subtaskId}/unlink`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              loadTaskDetails();
              loadActivityLog();
              Alert.alert("Success", "Subtask unlinked successfully");
            } catch (error) {
              console.error("Error unlinking subtask:", error);
              Alert.alert("Error", "Failed to unlink subtask");
            }
          },
        },
      ]
    );
  };

  const handleBackPress = () => {
    if (returnToGroup && typeof returnToGroup === 'string') {
      router.push({
        pathname: "/groups",
        params: { returnToGroup: returnToGroup }
      } as any);
    } else {
      router.back();
    }
  };

  const loadAvailableUsers = async () => {
    try {
      setLoadingUsers(true);
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.get(
        `http://${IP}:5555/task/${id}/available-assignees`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Filter users based on current user's role hierarchy
      const filteredUsers = filterAssignableUsers(response.data, user?.role || "");
      setAvailableUsers(filteredUsers);
    } catch (error) {
      console.error("Error loading available users:", error);
      Alert.alert("Error", "Failed to load available users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleReassign = async (userId: string) => {
    try {
      setReassigning(true);
      const token = await AsyncStorage.getItem("authToken");
      await axios.put(
        `http://${IP}:5555/task/${id}/reassign`,
        { userId, reason: reassignReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowReassignModal(false);
      setReassignReason("");
      loadTaskDetails();
      loadActivityLog();
      Alert.alert("Success", "Task reassigned successfully");
    } catch (error: any) {
      console.error("Error reassigning task:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to reassign task");
    } finally {
      setReassigning(false);
    }
  };

  const handleAssignToMe = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      await axios.put(
        `http://${IP}:5555/task/${id}/assign-to-me`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadTaskDetails();
      loadActivityLog();
      Alert.alert("Success", "Task assigned to you successfully");
    } catch (error: any) {
      console.error("Error claiming task:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to claim task");
    }
  };

  const handleAssignUser = async (userId: string) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      await axios.put(
        `http://${IP}:5555/task/${id}/assign-user`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowReassignModal(false);
      loadTaskDetails();
      loadActivityLog();
      Alert.alert("Success", "Task assigned successfully");
    } catch (error: any) {
      console.error("Error assigning task:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to assign task");
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

  const getActivityIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      created: "add-circle-outline",
      status_changed: "swap-horizontal-outline",
      priority_changed: "flag-outline",
      assigned: "person-add-outline",
      unassigned: "person-remove-outline",
      reassigned: "repeat-outline",
      self_assigned: "hand-right-outline",
      due_date_changed: "calendar-outline",
      title_changed: "create-outline",
      description_changed: "document-text-outline",
      checklist_added: "checkbox-outline",
      checklist_completed: "checkmark-circle-outline",
      checklist_uncompleted: "close-circle-outline",
      checklist_deleted: "trash-outline",
      subtask_added: "git-branch-outline",
      subtask_linked: "link-outline",
      subtask_unlinked: "unlink-outline",
      comment_added: "chatbubble-outline",
      attachment_added: "attach-outline",
      attachment_deleted: "close-outline",
      tag_added: "pricetag-outline",
      tag_removed: "pricetag-outline",
    };
    return icons[type] || "information-circle-outline";
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
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isAssigned = task.assignedTo.some((u: any) => u._id === user?._id);
  const isCreator = task.createdBy._id === user?._id;
  const canEdit = isAssigned || isCreator;
  const canManageSubtasks = SUBTASK_MANAGER_ROLES.includes(user?.role || "");

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Details</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content}>
        {task.parentTask && (
          <TouchableOpacity
            style={styles.parentTaskBanner}
            onPress={() => router.push({ 
              pathname: "/taskdetails", 
              params: { 
                id: task.parentTask?._id || "",
                returnToGroup: returnToGroup 
              } 
            })}
          >
            <Ionicons name="git-branch-outline" size={20} color={COLORS.primary} />
            <View style={styles.parentTaskInfo}>
              <Text style={styles.parentTaskLabel}>Part of</Text>
              <Text style={styles.parentTaskTitle}>{task.parentTask?.title || ""}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}

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

          {task.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {task.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Reassign Button */}
          {canEdit && (
            <View style={styles.reassignContainer}>
              <TouchableOpacity
                style={[
                  styles.reassignButton,
                  task.reassignCount >= 3 && styles.reassignButtonDisabled,
                ]}
                onPress={() => {
                  setShowReassignModal(true);
                  loadAvailableUsers();
                }}
                disabled={task.reassignCount >= 3}
              >
                <Ionicons 
                  name="swap-horizontal-outline" 
                  size={18} 
                  color={task.reassignCount >= 3 ? COLORS.textLight : COLORS.primary} 
                />
                <Text style={[
                  styles.reassignButtonText,
                  task.reassignCount >= 3 && styles.reassignButtonTextDisabled,
                ]}>
                  Reassign ({task.reassignCount || 0}/3)
                </Text>
              </TouchableOpacity>
              {task.reassignCount >= 3 && (
                <Text style={styles.reassignLimitText}>Reassign limit reached</Text>
              )}
              {/* Show assignable roles info */}
              {ROLE_HIERARCHY[user?.role || ""]?.length > 0 && (
                <Text style={styles.roleInfoText}>
                  Can assign to: {ROLE_HIERARCHY[user?.role || ""].join(", ")}
                </Text>
              )}
            </View>
          )}
        </View>

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

          {task.assignedTo.length > 0 ? (
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
          ) : (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color={COLORS.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Not Assigned</Text>
                <Text style={styles.infoSubtext}>This task is available for the team/group</Text>
                <View style={styles.assignmentActions}>
                  <TouchableOpacity
                    style={styles.claimButton}
                    onPress={handleAssignToMe}
                  >
                    <Ionicons name="hand-right-outline" size={18} color="#fff" />
                    <Text style={styles.claimButtonText}>Claim Task</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.assignButton}
                    onPress={() => {
                      loadAvailableUsers();
                      setShowReassignModal(true);
                    }}
                  >
                    <Ionicons name="person-add-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.assignButtonText}>Assign Someone</Text>
                  </TouchableOpacity>
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

          {/* Reassign History */}
          {task.reassignHistory && task.reassignHistory.length > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="git-network-outline" size={20} color={COLORS.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Reassign History</Text>
                <View style={styles.historyList}>
                  {task.reassignHistory.map((history, index) => (
                    <View key={history._id} style={styles.historyItem}>
                      <View style={styles.historyDot} />
                      <View style={styles.historyContent}>
                        <Text style={styles.historyText}>
                          <Text style={styles.historyBold}>
                            {history.reassignedBy.firstName} {history.reassignedBy.lastName}
                          </Text>
                          {" → "}
                          <Text style={styles.historyBold}>
                            {history.reassignedTo.firstName} {history.reassignedTo.lastName}
                          </Text>
                        </Text>
                        <Text style={styles.historyTime}>
                          {formatRelativeTime(history.reassignedAt)}
                        </Text>
                        {history.reason && (
                          <Text style={styles.historyReason}>{history.reason}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.checklistSection}>
          <Text style={styles.sectionTitle}>
            Checklist ({task.checklist?.filter(item => item.isCompleted).length || 0}/{task.checklist?.length || 0})
          </Text>

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

        <View style={styles.subtasksSection}>
          <View style={styles.subtasksSectionHeader}>
            <Text style={styles.sectionTitle}>
              Subtasks ({task.subtasks?.length || 0})
            </Text>
            {canEdit && canManageSubtasks && (
              <TouchableOpacity
                style={styles.linkTaskButton}
                onPress={() => {
                  setShowLinkTaskModal(true);
                  loadAvailableTasks();
                }}
              >
                <Ionicons name="link-outline" size={18} color={COLORS.primary} />
                <Text style={styles.linkTaskButtonText}>Link Task</Text>
              </TouchableOpacity>
            )}
          </View>

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

          {!task.subtasks || task.subtasks.length === 0 ? (
            <View style={styles.emptySubtasks}>
              <Ionicons name="git-branch-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptySubtasksText}>No subtasks yet</Text>
            </View>
          ) : (
            <View style={styles.subtasksList}>
              {task.subtasks.map((subtask) => (
                <View key={subtask._id} style={styles.subtaskCard}>
                  <TouchableOpacity
                    style={styles.subtaskCardContent}
                    onPress={() => router.push({ 
                      pathname: "/taskdetails", 
                      params: { 
                        id: subtask._id,
                        returnToGroup: returnToGroup 
                      } 
                    })}
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

                  {subtask.assignedTo && subtask.assignedTo.length > 0 && (
                    <View style={styles.subtaskAssigned}>
                      <Ionicons name="people-outline" size={14} color={COLORS.textLight} />
                      <Text style={styles.subtaskAssignedText}>
                        {subtask.assignedTo.length} assigned
                      </Text>
                    </View>
                  )}
                  </TouchableOpacity>

                  {canEdit && canManageSubtasks && (
                    <TouchableOpacity
                      style={styles.unlinkButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleUnlinkSubtask(subtask._id);
                      }}
                    >
                      <Ionicons name="unlink-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>Activity & Comments</Text>

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

          {comments.length === 0 && activityLog.length === 0 ? (
            <View style={styles.emptyComments}>
              <Ionicons name="time-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyCommentsText}>No activity yet</Text>
            </View>
          ) : (
            <>
              {[
                ...activityLog.map((activity) => ({
                  ...activity,
                  itemType: 'activity',
                  activityType: activity.type,
                  timestamp: activity.timestamp,
                })),
                ...comments.map((comment) => ({
                  ...comment,
                  itemType: 'comment',
                  timestamp: comment.createdAt,
                })),
              ]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((item) => {
                  if (item.itemType === 'activity') {
                    return (
                      <View key={`activity-${item._id}`} style={styles.activityItem}>
                        <View style={styles.activityIcon}>
                          <Ionicons 
                            name={getActivityIcon(item.activityType) as any} 
                            size={16} 
                            color={COLORS.primary} 
                          />
                        </View>
                        <View style={styles.activityContent}>
                          <Text style={styles.activityText}>
                            <Text style={styles.activityUser}>
                              {item.user.firstName} {item.user.lastName}
                            </Text>
                            {" "}
                            {item.description}
                          </Text>
                          <Text style={styles.activityTime}>
                            {formatRelativeTime(item.timestamp)}
                          </Text>
                        </View>
                      </View>
                    );
                  } else {
                    return (
                      <View key={`comment-${item._id}`} style={styles.comment}>
                        <View style={styles.commentAvatar}>
                          <Text style={styles.commentAvatarText}>
                            {item.author.firstName[0]}
                            {item.author.lastName[0]}
                          </Text>
                        </View>
                        <View style={styles.commentContent}>
                          <View style={styles.commentHeader}>
                            <Text style={styles.commentAuthor}>
                              {item.author.firstName} {item.author.lastName}
                            </Text>
                            <Text style={styles.commentTime}>
                              {formatRelativeTime(item.timestamp)}
                            </Text>
                          </View>
                          <Text style={styles.commentText}>{item.content}</Text>
                        </View>
                      </View>
                    );
                  }
                })}
            </>
          )}
        </View>
      </ScrollView>

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

      <Modal visible={showLinkTaskModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Link Existing Task</Text>
            
            {loadingTasks ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 40 }} />
            ) : availableTasks.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Ionicons name="folder-open-outline" size={48} color={COLORS.textLight} />
                <Text style={{ fontSize: 16, color: COLORS.textLight, marginTop: 12 }}>
                  No available tasks to link
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {availableTasks.map((availableTask) => (
                  <TouchableOpacity
                    key={availableTask._id}
                    style={styles.availableTaskItem}
                    onPress={() => handleLinkTask(availableTask._id)}
                    disabled={linkingTask}
                  >
                    <View style={styles.availableTaskContent}>
                      <Text style={styles.availableTaskTitle}>{availableTask.title}</Text>
                      <Text style={styles.availableTaskDescription} numberOfLines={2}>
                        {availableTask.description}
                      </Text>
                      <View style={styles.availableTaskMeta}>
                        <View style={styles.availableTaskStatus}>
                          <Text style={styles.availableTaskStatusText}>{availableTask.status}</Text>
                        </View>
                        <Text style={styles.availableTaskProgress}>{availableTask.progressPercentage}%</Text>
                      </View>
                    </View>
                    <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowLinkTaskModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reassign/Assign Modal */}
      <Modal visible={showReassignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {task?.assignedTo && task.assignedTo.length > 0 ? "Reassign Task" : "Assign Task"}
            </Text>
            {task?.assignedTo && task.assignedTo.length > 0 && (
              <Text style={styles.modalSubtitle}>
                Reassigns remaining: {3 - (task?.reassignCount || 0)}/3
              </Text>
            )}

            {/* Optional Reason Input - only for reassignment */}
            {task?.assignedTo && task.assignedTo.length > 0 && (
              <TextInput
                style={styles.reasonInput}
                placeholder="Reason for reassignment (optional)"
                value={reassignReason}
                onChangeText={setReassignReason}
                placeholderTextColor={COLORS.textLight}
                multiline
              />
            )}
            
            {loadingUsers ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 40 }} />
            ) : availableUsers.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Ionicons name="people-outline" size={48} color={COLORS.textLight} />
                <Text style={{ fontSize: 16, color: COLORS.textLight, marginTop: 12 }}>
                  No available users in this department
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 350 }}>
                {availableUsers.map((availableUser) => (
                  <TouchableOpacity
                    key={availableUser._id}
                    style={styles.userItem}
                    onPress={() => {
                      if (task?.assignedTo && task.assignedTo.length > 0) {
                        handleReassign(availableUser._id);
                      } else {
                        handleAssignUser(availableUser._id);
                      }
                    }}
                    disabled={reassigning}
                  >
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {availableUser.firstName[0]}
                        {availableUser.lastName[0]}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {availableUser.firstName} {availableUser.lastName}
                      </Text>
                      <Text style={styles.userRole}>{availableUser.role}</Text>
                    </View>
                    <Ionicons name="arrow-forward-circle-outline" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowReassignModal(false);
                setReassignReason("");
              }}
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
  subtasksSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  linkTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primary + "10",
    borderRadius: 8,
  },
  linkTaskButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  subtaskCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "flex-start",
    position: "relative",
  },
  subtaskCardContent: {
    flex: 1,
    padding: 16,
  },
  unlinkButton: {
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
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
  availableTaskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  availableTaskContent: {
    flex: 1,
  },
  availableTaskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  availableTaskDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  availableTaskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  availableTaskStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.primary + "20",
    borderRadius: 6,
  },
  availableTaskStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  availableTaskProgress: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  // Reassign styles
  reassignContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  reassignButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.primary + "10",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary + "30",
  },
  reassignButtonDisabled: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    opacity: 0.5,
  },
  reassignButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  reassignButtonTextDisabled: {
    color: COLORS.textLight,
  },
  reassignLimitText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 6,
    fontStyle: "italic",
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    maxHeight: 80,
    marginBottom: 16,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 6,
  },
  historyContent: {
    flex: 1,
  },
  historyText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  historyBold: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  historyTime: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  historyReason: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: 4,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
  },
  // Activity log styles
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary + '05',
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  activityIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  activityUser: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  infoSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  assignmentActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  claimButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  assignButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  assignButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  roleInfoText: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
