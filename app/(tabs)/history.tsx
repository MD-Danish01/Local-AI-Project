import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useLLMContext } from "@/contexts/LLMContext";
import type { Conversation } from "@/types/chat";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import {
    Alert,
    FlatList,
    Pressable,
    SafeAreaView,
    StyleSheet,
    View,
} from "react-native";

export default function HistoryScreen() {
  const router = useRouter();

  const {
    conversations,
    conversationId,
    switchConversation,
    deleteConversation,
    createNewChat,
    refreshConversations,
    isReady,
  } = useLLMContext();

  // Refresh conversations when screen is focused
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  const handleSelectChat = useCallback(
    (id: number) => {
      switchConversation(id);
      router.push("/(tabs)");
    },
    [switchConversation, router],
  );

  const handleDeleteChat = useCallback(
    (conversation: Conversation) => {
      Alert.alert(
        "Delete Chat",
        `Are you sure you want to delete "${conversation.title}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteConversation(conversation.id!),
          },
        ],
      );
    },
    [deleteConversation],
  );

  const handleNewChat = useCallback(async () => {
    await createNewChat();
    router.push("/(tabs)");
  }, [createNewChat, router]);

  const formatDate = (date?: Date | string) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: "short" });
    } else {
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const isActive = item.id === conversationId;

    return (
      <Pressable
        style={[styles.chatItem, isActive && { backgroundColor: "#2a2a2a" }]}
        onPress={() => handleSelectChat(item.id!)}
        onLongPress={() => handleDeleteChat(item)}
      >
        <View style={styles.chatIcon}>
          <IconSymbol
            name="message.fill"
            size={20}
            color={isActive ? "#FFFFFF" : "#666666"}
          />
        </View>
        <View style={styles.chatContent}>
          <ThemedText style={styles.chatTitle} numberOfLines={1}>
            {item.title}
          </ThemedText>
          <ThemedText style={styles.chatDate}>
            {formatDate(item.updatedAt)}
          </ThemedText>
        </View>
        <Pressable
          style={styles.deleteButton}
          onPress={() => handleDeleteChat(item)}
          hitSlop={8}
        >
          <IconSymbol name="trash" size={16} color="#666666" />
        </Pressable>
      </Pressable>
    );
  };

  const ListHeader = () => (
    <View style={styles.header}>
      <ThemedText style={styles.headerTitle}>History</ThemedText>
      <Pressable
        style={styles.newChatButton}
        onPress={handleNewChat}
        disabled={!isReady}
      >
        <IconSymbol name="plus" size={16} color="#1f2020" />
        <ThemedText style={styles.newChatText}>New</ThemedText>
      </Pressable>
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyState}>
      <IconSymbol name="message.fill" size={32} color="#555555" />
      <ThemedText style={styles.emptyText}>No conversations</ThemedText>
      <ThemedText style={styles.emptySubtext}>Start a new chat</ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.content}>
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id!.toString()}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1f2020",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  newChatText: {
    color: "#1f2020",
    fontWeight: "600",
    fontSize: 14,
  },
  listContent: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  chatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
  },
  chatContent: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  chatDate: {
    fontSize: 12,
    color: "#666666",
  },
  deleteButton: {
    padding: 8,
  },
  separator: {
    height: 1,
    backgroundColor: "#2a2a2a",
    marginLeft: 74,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#888888",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#555555",
  },
});
