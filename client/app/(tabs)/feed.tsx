import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  background: "#F8FAFC",
  text: "#0F172A",
  textLight: "#64748B",
};

export default function Feed() {
  return (
    <View style={styles.container}>
      <View style={styles.emptyState}>
        <Ionicons name="newspaper-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.emptyText}>Feed Page</Text>
        <Text style={styles.emptySubtext}>Task feed will be here</Text>
      </View>
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
});
