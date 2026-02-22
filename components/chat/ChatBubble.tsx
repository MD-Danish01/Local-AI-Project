import type { Message } from "@/types/chat";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

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
        <Text
          style={[styles.text, isUser ? styles.userText : styles.assistantText]}
        >
          {message.content}
        </Text>
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
});
