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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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

interface GroupDetailProps {
  groupId: string;
  onClose: () => void;
}

export default function GroupDetail({ groupId, onClose }: GroupDetailProps) {
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [group, setGroup] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"messages" | "tasks">("messages");
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        console.log("Using existing conversation:", convId);
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
        console.log("Created new conversation:", convId);
      }
      
      setConversationId(convId);

      if (convId) {
        const msgRes = await axios.get(
          `http://${IP}:5555/messages/conversation/${convId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log("Messages response:", msgRes.data);
        
        const loadedMessages = msgRes.data.messages || msgRes.data || [];
        console.log("Loaded messages count:", loadedMessages.length);
        setMessages(loadedMessages);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
      }

      const taskRes = await axios.get(`http://${IP}:5555/tasks/user/${user?._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(taskRes.data);

    } catch (error) {
      console.error("Error loading group data:", error);
      console.error("Error details:", error.response?.data || error.message);
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
      console.log("Cannot send - missing input or conversationId");
      return;
    }

    const messageText = messageInput;
    setMessageInput("");

    try {
      const token = await AsyncStorage.getItem("authToken");
      const formData = new FormData();
      formData.append("conversationId", conversationId);
      formData.append("content", messageText);

      console.log("Sending message to conversation:", conversationId);
      
      const response = await axios.post(`http://${IP}:5555/message/send`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Message sent successfully:", response.data);

      setMessages([...messages, response.data.messageData]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error("Error sending message:", error);
      console.error("Error details:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to send message");
      setMessageInput(messageText); 
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return COLORS.success;
      case "In Progress":
        return COLORS.primary;
      case "Blocked":
        return COLORS.danger;
      default:
        return COLORS.textLight;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Urgent":
        return COLORS.danger;
      case "High":
        return COLORS.warning;
      case "Medium":
        return COLORS.primary;
      default:
        return COLORS.textLight;
    }
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
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{group?.name}</Text>
          <Text style={styles.headerSubtitle}>
            {group?.members.length} members
          </Text>
        </View>
        <TouchableOpacity style={styles.headerButton}>
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
        contentContainerStyle={styles.contentContainer}
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
                <Ionicons name="checkbox-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.emptyText}>No tasks assigned</Text>
                <Text style={styles.emptySubtext}>Tasks will appear here</Text>
              </View>
            ) : (
              tasks.map((task) => (
                <View key={task._id} style={styles.taskCard}>
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <View
                      style={[
                        styles.priorityBadge,
                        { backgroundColor: getPriorityColor(task.priority) + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          { color: getPriorityColor(task.priority) },
                        ]}
                      >
                        {task.priority}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.taskDescription} numberOfLines={2}>
                    {task.description}
                  </Text>
                  <View style={styles.taskFooter}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(task.status) + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(task.status) },
                        ]}
                      >
                        {task.status}
                      </Text>
                    </View>
                    <View style={styles.dueDateContainer}>
                      <Ionicons name="calendar-outline" size={14} color={COLORS.textLight} />
                      <Text style={styles.dueDate}>{formatDate(task.dueDate)}</Text>
                    </View>
                  </View>
                </View>
              ))
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
  },
  taskCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
  },
  taskDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dueDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dueDate: {
    fontSize: 13,
    color: COLORS.textLight,
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
});