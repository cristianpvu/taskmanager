import React, { useState } from "react";
import { Text, View, SafeAreaView, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  primary: "#2563EB",
  white: "#FFFFFF",
  background: "#F8FAFC",
  text: "#0F172A",
  textLight: "#64748B",
  border: "#E2E8F0",
};

export default function Home() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"feed" | "groups" | "my-tasks" | "messages" | "profile">("feed");

  const renderFeed = () => (
    <ScrollView style={styles.content}>
      <View style={styles.emptyState}>
        <Ionicons name="newspaper-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.emptyText}>Feed Page</Text>
        <Text style={styles.emptySubtext}>Task feed will be here</Text>
      </View>
    </ScrollView>
  );

  const renderGroups = () => (
    <View style={styles.content}>
      <View style={styles.emptyState}>
        <Ionicons name="people-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.emptyText}>Groups</Text>
        <Text style={styles.emptySubtext}>Your groups will be here</Text>
      </View>
    </View>
  );

  const renderMyTasks = () => (
    <View style={styles.content}>
      <View style={styles.emptyState}>
        <Ionicons name="checkbox-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.emptyText}>My Tasks</Text>
        <Text style={styles.emptySubtext}>Your personal tasks will be here</Text>
      </View>
    </View>
  );

  const renderMessages = () => (
    <View style={styles.content}>
      <View style={styles.emptyState}>
        <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.emptyText}>Messages</Text>
        <Text style={styles.emptySubtext}>Your conversations will be here</Text>
      </View>
    </View>
  );

  const renderProfile = () => (
    <View style={styles.content}>
      <View style={styles.emptyState}>
        <Ionicons name="person-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.emptyText}>Profile</Text>
        <Text style={styles.emptySubtext}>Your profile settings will be here</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TaskManager</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      {activeTab === "feed" && renderFeed()}
      {activeTab === "groups" && renderGroups()}
      {activeTab === "my-tasks" && renderMyTasks()}
      {activeTab === "messages" && renderMessages()}
      {activeTab === "profile" && renderProfile()}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab("feed")}
        >
          <Ionicons
            name={activeTab === "feed" ? "home" : "home-outline"}
            size={24}
            color={activeTab === "feed" ? COLORS.primary : COLORS.textLight}
          />
          <Text style={[styles.navText, activeTab === "feed" && styles.navTextActive]}>Feed</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab("groups")}
        >
          <Ionicons
            name={activeTab === "groups" ? "people" : "people-outline"}
            size={24}
            color={activeTab === "groups" ? COLORS.primary : COLORS.textLight}
          />
          <Text style={[styles.navText, activeTab === "groups" && styles.navTextActive]}>Groups</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab("my-tasks")}
        >
          <Ionicons
            name={activeTab === "my-tasks" ? "checkbox" : "checkbox-outline"}
            size={24}
            color={activeTab === "my-tasks" ? COLORS.primary : COLORS.textLight}
          />
          <Text style={[styles.navText, activeTab === "my-tasks" && styles.navTextActive]}>My Tasks</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab("messages")}
        >
          <Ionicons
            name={activeTab === "messages" ? "chatbubbles" : "chatbubbles-outline"}
            size={24}
            color={activeTab === "messages" ? COLORS.primary : COLORS.textLight}
          />
          <Text style={[styles.navText, activeTab === "messages" && styles.navTextActive]}>Messages</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab("profile")}
        >
          <Ionicons
            name={activeTab === "profile" ? "person" : "person-outline"}
            size={24}
            color={activeTab === "profile" ? COLORS.primary : COLORS.textLight}
          />
          <Text style={[styles.navText, activeTab === "profile" && styles.navTextActive]}>Profile</Text>
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
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 120,
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
