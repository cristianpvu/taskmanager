import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { IP } from "@/data/ip";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { encryptText } from "@/utils/encryption";

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

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const PRIORITY_COLORS = {
  Low: "#10B981",
  Medium: "#3B82F6",
  High: "#F59E0B",
  Urgent: "#EF4444",
};

const AUTHORIZED_ROLES = ["CEO", "Project Manager", "Team Lead"];

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department: string;
}

interface Group {
  _id: string;
  name: string;
  department: string;
  members: any[];
}

type AssignmentType = "open" | "teams" | "individuals";

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
  checklist?: any[];
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

export default function Feed() {
  const { user } = useAuth();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDueTimePicker, setShowDueTimePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [tags, setTags] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("open");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [groupSearchResults, setGroupSearchResults] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);

  const canCreateTasks = AUTHORIZED_ROLES.includes(user?.role || "");

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.get(`http://${IP}:5555/tasks/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tasksData = response.data.tasks.map((task: Task) => ({
        ...task,
        checklist: task.checklist || [],
      }));
      setTasks(tasksData);
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoadingTasks(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const handleAddTask = () => {
    if (!canCreateTasks) {
      Alert.alert("Permission Denied", "Only CEO, Project Manager, and Team Lead can create tasks.");
      return;
    }
    setShowCreateModal(true);
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }

    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.get(`http://${IP}:5555/users/search`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { query, department: user?.department },
      });
      
      const filtered = response.data.filter(
        (u: User) => u._id !== user?._id && 
                    !selectedUsers.find((m) => m._id === u._id) &&
                    canAssignToRole(user?.role || "", u.role)
      );
      setUserSearchResults(filtered);
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  const loadGroups = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.get(`http://${IP}:5555/groups`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { department: user?.department },
      });
      setGroupSearchResults(response.data);
    } catch (error) {
      console.error("Error loading groups:", error);
    }
  };

  useEffect(() => {
    if (assignmentType === "teams" && showCreateModal) {
      loadGroups();
    }
  }, [assignmentType, showCreateModal]);

  const handleSelectUser = (selectedUser: User) => {
    setSelectedUsers([...selectedUsers, selectedUser]);
    setUserSearchQuery("");
    setUserSearchResults([]);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u._id !== userId));
  };

  const handleToggleGroup = (group: Group) => {
    const exists = selectedGroups.find((g) => g._id === group._id);
    if (exists) {
      setSelectedGroups(selectedGroups.filter((g) => g._id !== group._id));
    } else {
      setSelectedGroups([...selectedGroups, group]);
    }
  };

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklistItems([...checklistItems, newChecklistItem.trim()]);
      setNewChecklistItem("");
    }
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setDueDate(new Date());
    setStartDate(new Date());
    setTags("");
    setColor("#3B82F6");
    setAssignmentType("open");
    setSelectedUsers([]);
    setSelectedGroups([]);
    setUserSearchQuery("");
    setUserSearchResults([]);
    setChecklistItems([]);
    setNewChecklistItem("");
  };

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleString("ro-RO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCreateTask = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert("Error", "Please fill in title and description");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      
      const payload: any = {
        title,
        description,
        priority,
        color,
        department: user?.department,
        dueDate: dueDate.toISOString(),
        startDate: startDate.toISOString(),
        tags: tags.split(",").map((t) => t.trim()).filter((t) => t),
        checklist: checklistItems.map((text) => ({
          text,
          isCompleted: false,
        })),
      };

      if (assignmentType === "open") {
        payload.isOpenForClaims = true;
        payload.assignedTo = [];
        payload.assignedGroups = [];
      } else if (assignmentType === "teams") {
        payload.isOpenForClaims = false;
        payload.assignedGroups = selectedGroups.map((g) => g._id);
        payload.assignedTo = [];

        if (selectedGroups.length > 0) {
          try {
            console.log('🔐 Starting encryption for group task...');
            console.log('Selected groups:', selectedGroups);
            
            const groupId = selectedGroups[0]._id;
            console.log('Getting encryption key for group:', groupId);
            
            const keyResponse = await axios.get(
              `http://${IP}:5555/group/${groupId}/encryption-key`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            const encryptionKey = keyResponse.data.encryptionKey;
            console.log('✓ Got encryption key:', encryptionKey?.substring(0, 20) + '...');
            
            console.log('Encrypting title and description...');
            payload.titleEncrypted = await encryptText(title, encryptionKey);
            payload.descriptionEncrypted = await encryptText(description, encryptionKey);
            console.log('✅ Encryption successful!');
            console.log('titleEncrypted:', payload.titleEncrypted?.substring(0, 40) + '...');
          } catch (encError: any) {
            console.error("❌ Encryption error:", encError);
            console.error("Error details:", encError.response?.data || encError.message);
            
            if (encError.response?.status === 403 || encError.response?.status === 404) {
              Alert.alert(
                "Encryption Key Missing",
                encError.response?.data?.message || "One or more selected teams don't have encryption keys set up. Please contact an administrator.",
                [{ text: "OK" }]
              );
              setLoading(false);
              return;
            }
          }
        } else {
          console.log('⚠️ No groups selected, skipping encryption');
        }
      } else if (assignmentType === "individuals") {
        payload.isOpenForClaims = false;
        payload.assignedTo = selectedUsers.map((u) => u._id);
        payload.assignedGroups = [];
      }

      await axios.post(`http://${IP}:5555/task/create`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert("Success", "Task created successfully!");
      resetForm();
      setShowCreateModal(false);
      loadTasks();
    } catch (error: any) {
      console.error("Error creating task:", error);
      
      if (error.response?.data?.missingKeys) {
        Alert.alert(
          "Encryption Keys Missing",
          error.response.data.message,
          [
            { 
              text: "Contact Admin", 
              onPress: () => {
              }
            },
            { text: "OK", style: "cancel" }
          ]
        );
      } else {
        Alert.alert("Error", error.response?.data?.message || "Failed to create task");
      }
    } finally {
      setLoading(false);
    }
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

  const handleClaimTask = async (taskId: string) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      await axios.post(
        `http://${IP}:5555/task/${taskId}/claim`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", "Task claimed successfully!");
      loadTasks();
    } catch (error: any) {
      console.error("Error claiming task:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to claim task");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={loadingTasks || tasks.length === 0 ? styles.contentCenter : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {loadingTasks ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading tasks...</Text>
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No tasks available</Text>
            <Text style={styles.emptySubtext}>
              {canCreateTasks 
                ? "Create a new task to get started" 
                : "Tasks will appear here when available"}
            </Text>
          </View>
        ) : (
          <View style={styles.tasksContainer}>
            {tasks.map((task) => (
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
                <View style={styles.taskHeader}>
                  <View style={styles.taskHeaderLeft}>
                    <View
                      style={[
                        styles.priorityBadge,
                        { backgroundColor: PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] },
                      ]}
                    >
                      <Text style={styles.priorityBadgeText}>{task.priority}</Text>
                    </View>
                    {task.isOpenForClaims && (
                      <View style={styles.openBadge}>
                        <Ionicons name="globe" size={12} color={COLORS.success} />
                        <Text style={styles.openBadgeText}>Open</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.taskDueDate}>{formatDate(task.dueDate)}</Text>
                </View>

                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskDescription} numberOfLines={2}>
                  {task.description}
                </Text>

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

                  {task.isOpenForClaims && !task.isClaimed && (
                    <TouchableOpacity
                      style={styles.claimButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleClaimTask(task._id);
                      }}
                    >
                      <Ionicons name="hand-right" size={16} color={COLORS.white} />
                      <Text style={styles.claimButtonText}>Claim</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {canCreateTasks && (
        <TouchableOpacity style={styles.fab} onPress={handleAddTask}>
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      )}

      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Create New Task</Text>

              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter task title"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={COLORS.textLight}
              />

              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter task description"
                value={description}
                onChangeText={setDescription}
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Priority</Text>
              <View style={styles.priorityContainer}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityButton,
                      priority === p && { backgroundColor: PRIORITY_COLORS[p as keyof typeof PRIORITY_COLORS] },
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        priority === p && { color: COLORS.white },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Start Date & Time</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                <Text style={styles.dateButtonText}>{formatDateDisplay(startDate)}</Text>
              </TouchableOpacity>

              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowStartDatePicker(false);
                    if (selectedDate) {
                      setStartDate(selectedDate);
                      setShowStartTimePicker(true);
                    }
                  }}
                />
              )}

              {showStartTimePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="time"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowStartTimePicker(false);
                    if (selectedDate) {
                      setStartDate(selectedDate);
                    }
                  }}
                />
              )}

              <Text style={styles.label}>Due Date & Time *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDueDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                <Text style={styles.dateButtonText}>{formatDateDisplay(dueDate)}</Text>
              </TouchableOpacity>

              {showDueDatePicker && (
                <DateTimePicker
                  value={dueDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDueDatePicker(false);
                    if (selectedDate) {
                      setDueDate(selectedDate);
                      setShowDueTimePicker(true);
                    }
                  }}
                />
              )}

              {showDueTimePicker && (
                <DateTimePicker
                  value={dueDate}
                  mode="time"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDueTimePicker(false);
                    if (selectedDate) {
                      setDueDate(selectedDate);
                    }
                  }}
                />
              )}

              <Text style={styles.label}>Tags (comma separated)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. urgent, bug-fix, feature"
                value={tags}
                onChangeText={setTags}
                placeholderTextColor={COLORS.textLight}
              />

              <Text style={styles.label}>Assignment</Text>
              <View style={styles.assignmentTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.assignmentTypeButton,
                    assignmentType === "open" && styles.assignmentTypeButtonActive,
                  ]}
                  onPress={() => setAssignmentType("open")}
                >
                  <Ionicons
                    name="globe-outline"
                    size={20}
                    color={assignmentType === "open" ? COLORS.white : COLORS.primary}
                  />
                  <Text
                    style={[
                      styles.assignmentTypeText,
                      assignmentType === "open" && styles.assignmentTypeTextActive,
                    ]}
                  >
                    Open for All
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.assignmentTypeButton,
                    assignmentType === "teams" && styles.assignmentTypeButtonActive,
                  ]}
                  onPress={() => setAssignmentType("teams")}
                >
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={assignmentType === "teams" ? COLORS.white : COLORS.primary}
                  />
                  <Text
                    style={[
                      styles.assignmentTypeText,
                      assignmentType === "teams" && styles.assignmentTypeTextActive,
                    ]}
                  >
                    Teams
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.assignmentTypeButton,
                    assignmentType === "individuals" && styles.assignmentTypeButtonActive,
                  ]}
                  onPress={() => setAssignmentType("individuals")}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={assignmentType === "individuals" ? COLORS.white : COLORS.primary}
                  />
                  <Text
                    style={[
                      styles.assignmentTypeText,
                      assignmentType === "individuals" && styles.assignmentTypeTextActive,
                    ]}
                  >
                    Individuals
                  </Text>
                </TouchableOpacity>
              </View>

              {assignmentType === "teams" && (
                <View style={styles.selectionContainer}>
                  <Text style={styles.label}>Select Teams</Text>
                  {groupSearchResults.map((group) => (
                    <TouchableOpacity
                      key={group._id}
                      style={[
                        styles.selectionItem,
                        selectedGroups.find((g) => g._id === group._id) &&
                          styles.selectionItemActive,
                      ]}
                      onPress={() => handleToggleGroup(group)}
                    >
                      <Ionicons
                        name={
                          selectedGroups.find((g) => g._id === group._id)
                            ? "checkbox"
                            : "square-outline"
                        }
                        size={24}
                        color={COLORS.primary}
                      />
                      <Text style={styles.selectionItemText}>{group.name}</Text>
                      <Text style={styles.selectionItemSubtext}>
                        {group.members.length} members
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {assignmentType === "individuals" && (
                <View style={styles.selectionContainer}>
                  <Text style={styles.label}>Search and Add Users</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Search by name or email..."
                    value={userSearchQuery}
                    onChangeText={(text) => {
                      setUserSearchQuery(text);
                      searchUsers(text);
                    }}
                    placeholderTextColor={COLORS.textLight}
                  />

                  {userSearchResults.length > 0 && (
                    <View style={styles.searchResults}>
                      <ScrollView style={styles.searchResultsList} nestedScrollEnabled>
                        {userSearchResults.map((searchUser) => (
                          <TouchableOpacity
                            key={searchUser._id}
                            style={styles.userItem}
                            onPress={() => handleSelectUser(searchUser)}
                          >
                            <View style={styles.userAvatar}>
                              <Text style={styles.userAvatarText}>
                                {searchUser.firstName[0]}
                                {searchUser.lastName[0]}
                              </Text>
                            </View>
                            <View style={styles.userInfo}>
                              <Text style={styles.userName}>
                                {searchUser.firstName} {searchUser.lastName}
                              </Text>
                              <Text style={styles.userRole}>{searchUser.role}</Text>
                            </View>
                            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {selectedUsers.length > 0 && (
                    <View style={styles.selectedMembers}>
                      <Text style={styles.selectedLabel}>
                        Selected Users ({selectedUsers.length})
                      </Text>
                      {selectedUsers.map((member) => (
                        <View key={member._id} style={styles.selectedMemberItem}>
                          <View style={styles.userAvatar}>
                            <Text style={styles.userAvatarText}>
                              {member.firstName[0]}
                              {member.lastName[0]}
                            </Text>
                          </View>
                          <View style={styles.userInfo}>
                            <Text style={styles.userName}>
                              {member.firstName} {member.lastName}
                            </Text>
                            <Text style={styles.userRole}>{member.role}</Text>
                          </View>
                          <TouchableOpacity onPress={() => handleRemoveUser(member._id)}>
                            <Ionicons name="close-circle" size={24} color={COLORS.textLight} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <Text style={styles.label}>Checklist (optional)</Text>
              <View style={styles.checklistContainer}>
                <View style={styles.addChecklistItemContainer}>
                  <TextInput
                    style={styles.checklistInput}
                    placeholder="Add a to-do item..."
                    value={newChecklistItem}
                    onChangeText={setNewChecklistItem}
                    placeholderTextColor={COLORS.textLight}
                    onSubmitEditing={handleAddChecklistItem}
                  />
                  <TouchableOpacity
                    style={styles.addChecklistItemButton}
                    onPress={handleAddChecklistItem}
                  >
                    <Ionicons name="add" size={20} color={COLORS.white} />
                  </TouchableOpacity>
                </View>

                {checklistItems.length > 0 && (
                  <View style={styles.checklistItemsList}>
                    {checklistItems.map((item, index) => (
                      <View key={index} style={styles.checklistItemRow}>
                        <Ionicons name="checkbox-outline" size={20} color={COLORS.textLight} />
                        <Text style={styles.checklistItemText}>{item}</Text>
                        <TouchableOpacity onPress={() => handleRemoveChecklistItem(index)}>
                          <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    resetForm();
                    setShowCreateModal(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.createButton]}
                  onPress={handleCreateTask}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.createButtonText}>Create Task</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 500,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 12,
    backgroundColor: COLORS.white,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  priorityContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  assignmentTypeContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  assignmentTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    backgroundColor: COLORS.white,
    gap: 4,
  },
  assignmentTypeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  assignmentTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  assignmentTypeTextActive: {
    color: COLORS.white,
  },
  selectionContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  selectionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    backgroundColor: COLORS.white,
    gap: 12,
  },
  selectionItemActive: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.primary,
  },
  selectionItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  selectionItemSubtext: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  searchResults: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: COLORS.white,
  },
  searchResultsList: {
    maxHeight: 200,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
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
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  selectedMembers: {
    marginTop: 12,
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  selectedMemberItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
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
  createButton: {
    backgroundColor: COLORS.primary,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  checklistContainer: {
    marginBottom: 20,
  },
  addChecklistItemContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  checklistInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  addChecklistItemButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checklistItemsList: {
    gap: 8,
  },
  checklistItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checklistItemText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
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
  openBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
  },
  openBadgeText: {
    color: COLORS.success,
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
  claimButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  claimButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: COLORS.white,
  },
  dateButtonText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
});
