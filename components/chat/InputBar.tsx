import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

interface InputBarProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isGenerating?: boolean;
}

export function InputBar({
  onSend,
  disabled = false,
  isGenerating = false,
}: InputBarProps) {
  const [inputText, setInputText] = useState("");

  const handleSend = () => {
    if (inputText.trim() && !disabled) {
      onSend(inputText.trim());
      setInputText("");
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={inputText}
        onChangeText={setInputText}
        placeholder="Message..."
        placeholderTextColor="#666666"
        multiline
        maxLength={1000}
        editable={!disabled && !isGenerating}
        onSubmitEditing={handleSend}
      />
      <TouchableOpacity
        style={[
          styles.sendButton,
          (disabled || isGenerating || !inputText.trim()) &&
            styles.sendButtonDisabled,
        ]}
        onPress={handleSend}
        disabled={disabled || isGenerating || !inputText.trim()}
      >
        <Ionicons
          name="arrow-up"
          size={20}
          color={
            disabled || isGenerating || !inputText.trim()
              ? "#666666"
              : "#1f2020"
          }
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1f2020",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 15,
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#2a2a2a",
  },
});
