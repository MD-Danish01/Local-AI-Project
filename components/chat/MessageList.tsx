import type { Message } from "@/types/chat";
import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { ChatBubble } from "./ChatBubble";

interface MessageListProps {
  messages: Message[];
  streamingContent?: string;
  isGenerating?: boolean;
}

export function MessageList({
  messages,
  streamingContent,
  isGenerating,
}: MessageListProps) {
  const flatListRef = React.useRef<FlatList>(null);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, streamingContent]);

  const renderItem = ({ item }: { item: Message }) => (
    <ChatBubble message={item} />
  );

  return (
    <View style={styles.container}>
      {messages.length === 0 && !isGenerating ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Start a conversation</Text>
          <Text style={styles.emptySubtext}>
            AI runs entirely on your device
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id?.toString() || `msg-${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Show streaming content as temporary assistant message */}
      {isGenerating && streamingContent && (
        <View style={styles.streamingContainer}>
          <ChatBubble
            message={{
              conversationId: 0,
              role: "assistant",
              content: streamingContent,
            }}
          />
        </View>
      )}

      {/* Show typing indicator when waiting for first token */}
      {isGenerating && !streamingContent && (
        <View style={styles.typingContainer}>
          <View style={styles.typingBubble}>
            <Text style={styles.typingText}>...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1f2020",
  },
  listContent: {
    paddingVertical: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: "#888888",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#555555",
  },
  streamingContainer: {
    paddingBottom: 8,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "flex-start",
  },
  typingBubble: {
    backgroundColor: "#2a2a2a",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  typingText: {
    color: "#888888",
    fontSize: 18,
    letterSpacing: 2,
  },
});
