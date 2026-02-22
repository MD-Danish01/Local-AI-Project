import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

interface ChatHeaderProps {
  title: string;
  onNewChat: () => void;
  disabled?: boolean;
}

export function ChatHeader({ title, onNewChat, disabled }: ChatHeaderProps) {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title} numberOfLines={1}>
        {title}
      </ThemedText>

      <Pressable
        style={({ pressed }) => [
          styles.newChatButton,
          disabled && styles.disabledButton,
          pressed && styles.pressedButton,
        ]}
        onPress={onNewChat}
        disabled={disabled}
        hitSlop={8}
      >
        <IconSymbol name="plus" size={18} color="#1f2020" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#1f2020",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
  },
  newChatButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.3,
  },
  pressedButton: {
    opacity: 0.7,
  },
});
