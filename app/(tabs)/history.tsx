import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useLLMContext } from "@/contexts/LLMContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
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
          isActive && { backgroundColor: colors.tint + "20" },
        ]}
        onPress={() => handleSelectChat(item.id!)}
        onLongPress={() => handleDeleteChat(item)}
      >
        <View style={styles.chatIcon}>
          <IconSymbol
            name="message.fill"
            size={24}
            color={isActive ? colors.tint : colors.icon}
          />
        </View>
        <View style={styles.chatContent}>
          <ThemedText
            style={[styles.chatTitle, isActive && { color: colors.tint }]}
            numberOfLines={1}
          >
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
          <IconSymbol name="trash" size={18} color="#FF6B6B" />
        </Pressable>
      </Pressable>
    );
  };

  const ListHeader = () => (
    <View style={styles.header}>
      <ThemedText style={styles.headerTitle}>Chat History</ThemedText>
      <Pressable
        style={[styles.newChatButton, { backgroundColor: colors.tint }]}
        onPress={handleNewChat}
        disabled={!isReady}
      >
        <IconSymbol name="plus" size={20} color="#FFFFFF" />
        <ThemedText style={styles.newChatText}>New Chat</ThemedText>
      </Pressable>
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyState}>
      <IconSymbol name="message.fill" size={48} color={colors.icon} />
      <ThemedText style={styles.emptyText}>No conversations yet</ThemedText>
      <ThemedText style={styles.emptySubtext}>
        Start a new chat to begin
      </ThemedText>
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
    padding: 16,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
  },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  newChatText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  listContent: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  chatIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  chatContent: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  chatDate: {
    fontSize: 13,
    opacity: 0.6,
  },
  deleteButton: {
    padding: 8,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginLeft: 72,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
  },
});
