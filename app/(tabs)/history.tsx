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
        style={[
          styles.chatItem,
          isActive && styles.chatItemActive,
        ]}
        onPress={() => handleSelectChat(item.id!)}
        onLongPress={() => handleDeleteChat(item)}
      >
        <View style={[styles.chatIcon, isActive && styles.chatIconActive]}>
          <IconSymbol
            name="message.fill"
            size={18}
            color={isActive ? "#00D9FF" : "#7F8C9B"}
          />
        </View>
        <View style={styles.chatContent}>
          <View style={styles.titleRow}>
            <ThemedText
              style={[styles.chatTitle, isActive && styles.chatTitleActive]}
              numberOfLines={1}
            >
              {item.title}
            </ThemedText>
            {isActive && <View style={styles.activeIndicator} />}
          </View>
          <ThemedText style={styles.chatDate}>
            {formatDate(item.updatedAt)}
          </ThemedText>
        </View>
        <Pressable
          style={styles.deleteButton}
          onPress={() => handleDeleteChat(item)}
          hitSlop={8}
        >
          <IconSymbol
            name="trash"
            size={16}
            color={isActive ? "#FF6B6B" : "#666666"}
          />
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
    backgroundColor: "#0A0E1A",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1F2E",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00D9FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  newChatText: {
    color: "#0A0E1A",
    fontWeight: "700",
    fontSize: 13,
  },
  listContent: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    backgroundColor: "transparent",
  },
  chatItemActive: {
    backgroundColor: "#1A1F2E",
    borderLeftWidth: 4,
    borderLeftColor: "#00D9FF",
  },
  chatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1A1F2E",
    justifyContent: "center",
    alignItems: "center",
  },
  chatIconActive: {
    backgroundColor: "rgba(0, 217, 255, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(0, 217, 255, 0.3)",
  },
  chatContent: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#D1D8E0",
    flex: 1,
  },
  chatTitleActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  chatDate: {
    fontSize: 12,
    color: "#7F8C9B",
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00D9FF",
  },
  deleteButton: {
    padding: 8,
    opacity: 0.8,
  },
  separator: {
    height: 1,
    backgroundColor: "#1A1F2E",
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
    fontWeight: "600",
    color: "#7F8C9B",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#555555",
  },
});
