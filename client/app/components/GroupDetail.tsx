import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
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

interface GroupDetailProps {
  groupId: string;
  onClose: () => void;
}

export default function GroupDetail({ groupId, onClose }: GroupDetailProps) {
  const { user } = useAuth();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const [group, setGroup] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"messages" | "tasks">("messages");
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadGroupData();
  }, []);

  const loadGroupData = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");

      const groupRes = await axios.get(`http://${IP}:5555/group/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setGroup(groupRes.data);

      const memberIds = groupRes.data.members.map((m: any) => m._id);
      
      const conversationsRes = await axios.get(
        `http://${IP}:5555/conversations/user/${user?._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      let existingConversation = conversationsRes.data.find((conv: any) => {
        if (!conv.isGroupChat) return false;
        
        const convMemberIds = conv.participants.map((p: any) => p._id).sort();
        const groupMemberIds = [...memberIds].sort();
        
        return convMemberIds.length === groupMemberIds.length &&
               convMemberIds.every((id: string, index: number) => id === groupMemberIds[index]);
      });
      
      let convId;
      
      if (existingConversation) {
        convId = existingConversation._id;
      } else {
        const convRes = await axios.post(
          `http://${IP}:5555/conversation/create`,
          {
            participants: memberIds,
            isGroupChat: true,
            groupName: groupRes.data.name,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        convId = convRes.data.conversation?._id || convRes.data._id;
      }
      
      setConversationId(convId);

      if (convId) {
        const msgRes = await axios.get(
          `http://${IP}:5555/messages/conversation/${convId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        const loadedMessages = msgRes.data.messages || msgRes.data || [];
        setMessages(loadedMessages);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
      }

      const taskRes = await axios.get(`http://${IP}:5555/tasks/group/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const tasksData = taskRes.data.map((task: any) => ({
        ...task,
        checklist: task.checklist || [],
      }));
      setTasks(tasksData);

    } catch (error: any) {
      console.error("Error loading group data:", error);
      Alert.alert("Error", "Failed to load group data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadGroupData();
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !conversationId) {
      return;
    }

    const messageText = messageInput;
    setMessageInput("");

    try {
      const token = await AsyncStorage.getItem("authToken");
      const formData = new FormData();
      formData.append("conversationId", conversationId);
      formData.append("content", messageText);

      const response = await axios.post(`http://${IP}:5555/message/send`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setMessages([...messages, response.data.messageData]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
      setMessageInput(messageText);
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.headerInfo}
          onPress={() => setShowMembersModal(true)}
        >
          <Text style={styles.headerTitle}>{group?.name}</Text>
          <Text style={styles.headerSubtitle}>
            {group?.members?.length || 0} members · Tap to view
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => setShowMembersModal(true)}
        >
          <Ionicons name="information-circle-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "messages" && styles.activeTab]}
          onPress={() => setActiveTab("messages")}
        >
          <Ionicons
            name="chatbubble-outline"
            size={20}
            color={activeTab === "messages" ? COLORS.primary : COLORS.textLight}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "messages" && styles.activeTabText,
            ]}
          >
            Messages
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "tasks" && styles.activeTab]}
          onPress={() => setActiveTab("tasks")}
        >
          <Ionicons
            name="checkbox-outline"
            size={20}
            color={activeTab === "tasks" ? COLORS.primary : COLORS.textLight}
          />
          <Text
            style={[styles.tabText, activeTab === "tasks" && styles.activeTabText]}
          >
            Tasks ({tasks.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={activeTab === "tasks" && tasks.length === 0 ? styles.contentCenter : styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {activeTab === "messages" ? (
          <View style={styles.messagesContainer}>
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>Start the conversation!</Text>
              </View>
            ) : (
              messages.map((msg) => {
                const isOwnMessage = msg.sender._id === user?._id;
                return (
                  <View
                    key={msg._id}
                    style={[
                      styles.messageItem,
                      isOwnMessage ? styles.ownMessage : styles.otherMessage,
                    ]}
                  >
                    {!isOwnMessage && (
                      <View style={styles.messageHeader}>
                        <Text style={styles.senderName}>
                          {msg.sender.firstName} {msg.sender.lastName}
                        </Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.messageContent,
                        isOwnMessage && styles.ownMessageContent,
                      ]}
                    >
                      {msg.content}
                    </Text>
                    <Text
                      style={[
                        styles.messageTime,
                        isOwnMessage && styles.ownMessageTime,
                      ]}
                    >
                      {formatTime(msg.createdAt)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <View style={styles.tasksContainer}>
            {tasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkbox-outline" size={64} color={COLORS.textLight} />
                <Text style={styles.emptyText}>No tasks assigned</Text>
                <Text style={styles.emptySubtext}>Tasks will appear here</Text>
              </View>
            ) : (
              <>
                {tasks.map((task) => (
                  <TouchableOpacity
                    key={task._id}
                    style={[styles.taskCard, { borderLeftColor: task.color }]}
                    onPress={() => {
                      console.log("Navigating to task:", task._id);
                      router.push({
                        pathname: "/taskdetails",
                        params: { id: task._id, returnToGroup: groupId }
                      } as any);
                    }}
                    activeOpacity={0.7}
                  >
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

                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.taskDescription} numberOfLines={2}>
                      {task.description}
                    </Text>

                    {task.tags && task.tags.length > 0 && (
                      <View style={styles.tagsContainer}>
                        {task.tags.slice(0, 3).map((tag: string, index: number) => (
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

                      <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {activeTab === "messages" && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={messageInput}
            onChangeText={setMessageInput}
            placeholderTextColor={COLORS.textLight}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !messageInput.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!messageInput.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={messageInput.trim() ? COLORS.white : COLORS.textLight}
            />
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showMembersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMembersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Group Members</Text>
              <TouchableOpacity onPress={() => setShowMembersModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.membersList}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {!group ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.emptySubtext}>Loading members...</Text>
                </View>
              ) : (
                <>
                  {group.leader && (
                    <View style={styles.memberSection}>
                      <Text style={styles.memberSectionTitle}>Group Admin</Text>
                      <View style={styles.memberItem}>
                        <View style={styles.memberAvatar}>
                          <Text style={styles.memberAvatarText}>
                            {(group.leader.firstName?.[0] || "").toUpperCase()}
                            {(group.leader.lastName?.[0] || "").toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.memberInfo}>
                          <Text style={styles.memberName}>
                            {group.leader.firstName || ""} {group.leader.lastName || ""}
                          </Text>
                          <Text style={styles.memberRole}>
                            {group.leader.role || "No role"}
                          </Text>
                        </View>
                        <View style={styles.leaderBadge}>
                          <Ionicons name="star" size={16} color={COLORS.warning} />
                        </View>
                      </View>
                    </View>
                  )}

                  <View style={styles.memberSection}>
                    <Text style={styles.memberSectionTitle}>
                      All Members ({group.members?.length || 0})
                    </Text>
                    {group.members && group.members.length > 0 ? (
                      <>
                        {group.members.map((member: any) => {
                          if (!member || !member._id) return null;
                          
                          const isLeader = group.leader && member._id === group.leader._id;
                          
                          return (
                            <View key={member._id} style={styles.memberItem}>
                              <View style={styles.memberAvatar}>
                                <Text style={styles.memberAvatarText}>
                                  {(member.firstName?.[0] || "?").toUpperCase()}
                                  {(member.lastName?.[0] || "?").toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.memberInfo}>
                                <Text style={styles.memberName}>
                                  {member.firstName || "Unknown"} {member.lastName || ""}
                                </Text>
                                <Text style={styles.memberRole}>
                                  {member.role || "No role"}
                                </Text>
                              </View>
                              {isLeader && (
                                <View style={styles.leaderBadge}>
                                  <Ionicons name="star" size={16} color={COLORS.warning} />
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </>
                    ) : (
                      <View style={{ padding: 20, backgroundColor: COLORS.background }}>
                        <Text style={styles.emptyText}>No members found</Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textLight,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 16,
  },
  contentCenter: {
    flexGrow: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messageItem: {
    maxWidth: "80%",
    marginBottom: 16,
    borderRadius: 12,
    padding: 12,
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ownMessage: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.primary,
  },
  messageHeader: {
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  messageContent: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 20,
  },
  ownMessageContent: {
    color: COLORS.white,
  },
  messageTime: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
  },
  ownMessageTime: {
    color: COLORS.white,
    opacity: 0.8,
  },
  tasksContainer: {
    flex: 1,
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
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.background,
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
    height: "80%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
  },
  membersList: {
    flex: 1,
    paddingTop: 8,
  },
  memberSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  memberSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textLight,
    marginBottom: 12,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  memberAvatarText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  leaderBadge: {
    marginLeft: 8,
  },
});
