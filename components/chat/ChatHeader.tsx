import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

interface ChatHeaderProps {
  title: string;
  onNewChat: () => void;
  disabled?: boolean;
}

export function ChatHeader({ title, onNewChat, disabled }: ChatHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title} numberOfLines={1}>
        {title}
      </ThemedText>
      <Pressable
        style={[
          styles.newChatButton,
          { backgroundColor: colors.tint },
          disabled && styles.disabledButton,
        ]}
        onPress={onNewChat}
        disabled={disabled}
        hitSlop={8}
      >
        <IconSymbol name="plus" size={20} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  newChatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
