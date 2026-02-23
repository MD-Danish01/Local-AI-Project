import type { Message } from "@/types/chat";
import React, { useState } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { RichText } from "./RichText";

interface ChatBubbleProps {
  message: Message;
  /** Show thinking section during streaming */
  isStreaming?: boolean;
}

export function ChatBubble({ message, isStreaming = false }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(isStreaming);

  const hasThinking = message.thinking && message.thinking.length > 0;
  const showThinkingToggle = hasThinking && !isStreaming;

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        {/* Thinking Section (only for assistant with thinking) */}
        {hasThinking && (
          <View style={styles.thinkingContainer}>
            <TouchableOpacity
              style={styles.thinkingHeader}
              onPress={() => setIsThinkingExpanded(!isThinkingExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.thinkingIcon}>💭</Text>
              <Text style={styles.thinkingLabel}>
                {isStreaming ? "Thinking..." : "View Reasoning"}
              </Text>
              {showThinkingToggle && (
                <Text style={styles.thinkingToggle}>
                  {isThinkingExpanded ? "▼" : "▶"}
                </Text>
              )}
            </TouchableOpacity>

            {(isThinkingExpanded || isStreaming) && (
              <View style={styles.thinkingContent}>
                <Text style={styles.thinkingText}>{message.thinking}</Text>
              </View>
            )}
          </View>
        )}

        {/* Main Response */}
        {message.content &&
          message.content.length > 0 &&
          (isUser ? (
            <Text style={[styles.text, styles.userText]}>
              {message.content}
            </Text>
          ) : (
            <RichText color="#FFFFFF" fontSize={15}>
              {message.content}
            </RichText>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    marginHorizontal: 16,
  },
  userContainer: {
    alignItems: "flex-end",
  },
  assistantContainer: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "85%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    backgroundColor: "#2a2a2a",
    borderRadius: 20,
    borderBottomLeftRadius: 6,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: "#1f2020",
  },
  assistantText: {
    color: "#FFFFFF",
  },

  // Thinking section styles
  thinkingContainer: {
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: "rgba(0, 217, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 217, 255, 0.3)",
    overflow: "hidden",
  },
  thinkingHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 8,
  },
  thinkingIcon: {
    fontSize: 16,
  },
  thinkingLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#00D9FF",
  },
  thinkingToggle: {
    fontSize: 12,
    color: "#00D9FF",
  },
  thinkingContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 217, 255, 0.2)",
  },
  thinkingText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
});
