import React, { useState, useEffect } from "react";
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { IP } from "@/data/ip";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GroupDetail from "../components/GroupDetail";
import { useRouter, useLocalSearchParams } from "expo-router";

const COLORS = {
  primary: "#2563EB",
  white: "#FFFFFF",
  background: "#F8FAFC",
  text: "#0F172A",
  textSecondary: "#475569",
  textLight: "#64748B",
  border: "#E2E8F0",
};

interface Group {
  _id: string;
  name: string;
  description?: string;
  department: string;
  members: any[];
  leader: any;
  isActive: boolean;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department: string;
}

export default function Teams() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [groups, setGroups] = useState<Group[]>([]);
  const [departmentGroup, setDepartmentGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
    loadDepartmentGroup();
  }, []);

  useEffect(() => {
    if (params.returnToGroup && typeof params.returnToGroup === 'string') {
      setSelectedGroup(params.returnToGroup);
      router.setParams({ returnToGroup: undefined });
    }
  }, [params.returnToGroup]);

  const loadGroups = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.get(`http://${IP}:5555/groups`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          department: user?.department,
        },
      });
      const userGroups = response.data.filter((group: Group) =>
        group.members.some((member) => member._id === user?._id) &&
        group.name !== user?.department
      );
      
      setGroups(userGroups);
    } catch (error) {
      console.error("Error loading groups:", error);
      Alert.alert("Error", "Failed to load teams");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDepartmentGroup = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.get(
        `http://${IP}:5555/group/department/${user?.department}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDepartmentGroup(response.data);
    } catch (error) {
      console.error("Error loading department group:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadGroups();
    loadDepartmentGroup();
  };

  const handleGenerateEncryptionKeys = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.post(
        `http://${IP}:5555/admin/generate-all-group-keys`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert(
        "Success", 
        `Generated encryption keys for ${response.data.count} groups!`
      );
    } catch (error: any) {
      console.error("Error generating keys:", error);
      Alert.alert(
        "Error", 
        error.response?.data?.message || "Failed to generate encryption keys"
      );
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const token = await AsyncStorage.getItem("authToken");
      
      const canSearchAllUsers = ["CEO", "Project Manager"].includes(user?.role || "");
      
      const response = await axios.get(`http://${IP}:5555/users/search`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          query,
          ...(canSearchAllUsers ? {} : { department: user?.department }),
        },
      });
      const filtered = response.data.filter(
        (u: User) => u._id !== user?._id && !selectedMembers.find((m) => m._id === u._id)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  const handleSelectMember = (member: User) => {
    setSelectedMembers([...selectedMembers, member]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveMember = (memberId: string) => {
    setSelectedMembers(selectedMembers.filter((m) => m._id !== memberId));
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      Alert.alert("Error", "Please enter a team name");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("authToken");
      const memberIds = [user?._id, ...selectedMembers.map((m) => m._id)];

      await axios.post(
        `http://${IP}:5555/group/create`,
        {
          name: newTeamName,
          description: newTeamDescription,
          department: user?.department,
          members: memberIds,
          leader: user?._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert("Success", "Team created successfully!");
      setNewTeamName("");
      setNewTeamDescription("");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedMembers([]);
      setShowCreateModal(false);
      loadGroups();
    } catch (error) {
      console.error("Error creating team:", error);
      Alert.alert("Error", "Failed to create team");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {(user?.role === "CEO" || user?.role === "Admin") && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.encryptionButton}
              onPress={handleGenerateEncryptionKeys}
            >
              <Ionicons name="key" size={20} color={COLORS.white} />
              <Text style={styles.encryptionButtonText}>
                Generate Encryption Keys for All Groups
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Department Team</Text>
          {departmentGroup ? (
            <TouchableOpacity 
              style={styles.teamCard}
              onPress={() => setSelectedGroup(departmentGroup._id)}
            >
              <View style={styles.teamIcon}>
                <Ionicons name="business" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.teamInfo}>
                <Text style={styles.teamName}>{user?.department}</Text>
                <Text style={styles.teamSubtext}>
                  Department team • {departmentGroup.members.length} {departmentGroup.members.length === 1 ? "member" : "members"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.teamCard} disabled>
              <View style={styles.teamIcon}>
                <Ionicons name="business" size={24} color={COLORS.textLight} />
              </View>
              <View style={styles.teamInfo}>
                <Text style={styles.teamName}>{user?.department}</Text>
                <Text style={styles.teamSubtext}>Loading department team...</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Teams</Text>
            <Text style={styles.teamCount}>{groups.length}</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : groups.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No custom teams yet</Text>
              <Text style={styles.emptySubtext}>Create a team to collaborate with others</Text>
            </View>
          ) : (
            groups.map((group) => (
              <TouchableOpacity key={group._id} style={styles.teamCard} onPress={() => setSelectedGroup(group._id)}>
                <View style={styles.teamIcon}>
                  <Ionicons name="people" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{group.name}</Text>
                  <Text style={styles.teamSubtext}>
                    {group.members.length} {group.members.length === 1 ? "member" : "members"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>

      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Team</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Team name"
              value={newTeamName}
              onChangeText={setNewTeamName}
              placeholderTextColor={COLORS.textLight}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={newTeamDescription}
              onChangeText={setNewTeamDescription}
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={3}
            />

            {/* Add Members Section */}
            <Text style={styles.sectionLabel}>Add Members</Text>
            <TextInput
              style={styles.input}
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                searchUsers(text);
              }}
              placeholderTextColor={COLORS.textLight}
            />

            {/* Search Results */}
            {searchResults.length > 0 && (
              <View style={styles.searchResults}>
                <ScrollView style={styles.searchResultsList} nestedScrollEnabled>
                  {searchResults.map((user) => (
                    <TouchableOpacity
                      key={user._id}
                      style={styles.userItem}
                      onPress={() => handleSelectMember(user)}
                    >
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>
                          {user.firstName[0]}
                          {user.lastName[0]}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>
                          {user.firstName} {user.lastName}
                        </Text>
                        <Text style={styles.userRole}>{user.role}</Text>
                      </View>
                      <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <View style={styles.selectedMembers}>
                <Text style={styles.selectedLabel}>Selected Members ({selectedMembers.length})</Text>
                {selectedMembers.map((member) => (
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
                    <TouchableOpacity onPress={() => handleRemoveMember(member._id)}>
                      <Ionicons name="close-circle" size={24} color={COLORS.textLight} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewTeamName("");
                  setNewTeamDescription("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateTeam}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={!!selectedGroup}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedGroup && (
          <GroupDetail 
            groupId={selectedGroup} 
            onClose={() => setSelectedGroup(null)} 
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 12,
  },
  teamCount: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textLight,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  teamIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  teamSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  emptyState: {
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
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  searchResults: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 16,
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
    marginBottom: 16,
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
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
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
  encryptionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  encryptionButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
  },
});
