import { ChatHeader } from "@/components/chat/ChatHeader";
import { InputBar } from "@/components/chat/InputBar";
import { MessageList } from "@/components/chat/MessageList";
import { ModelSelectionScreen } from "@/components/models/ModelSelectionScreen";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ModelDownloadScreen } from "@/components/ui/ModelDownloadScreen";
import { useLLMContext } from "@/contexts/LLMContext";
import { useLLMChat } from "@/hooks/useLLMChat";
import React, { useCallback, useMemo } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const {
    isReady,
    isLoading,
    needsModelSelection,
    needsDownload,
    isDownloading,
    progress,
    downloadedBytes,
    totalBytes,
    error,
    conversationId,
    activeModel,
    conversations,
    startDownload,
    cancelDownload,
    createNewChat,
    refreshConversations,
  } = useLLMContext();

  const chat = useLLMChat(conversationId || 0, {
    onTitleGenerated: refreshConversations,
  });

  // Get current conversation title
  const currentTitle = useMemo(() => {
    const current = conversations.find((c) => c.id === conversationId);
    return current?.title || "New Chat";
  }, [conversations, conversationId]);

  const handleNewChat = useCallback(async () => {
    await createNewChat();
    await refreshConversations();
  }, [createNewChat, refreshConversations]);

  // Handle download start - for now, download the active model
  const handleStartDownload = useCallback(() => {
    if (activeModel) {
      startDownload(activeModel);
    }
  }, [activeModel, startDownload]);

  // ---- No model selected yet ----
  if (needsModelSelection) {
    return <ModelSelectionScreen />;
  }

  // ---- Model not yet on device ----
  if (needsDownload || isDownloading) {
    return (
      <ModelDownloadScreen
        isDownloading={isDownloading}
        progress={progress}
        downloadedBytes={downloadedBytes}
        totalBytes={totalBytes}
        error={error}
        onStartDownload={handleStartDownload}
        onCancelDownload={cancelDownload}
      />
    );
  }

  // ---- Loading DB / model into memory ----
  if (isLoading || (!isReady && !error)) {
    return (
      <LoadingScreen progress={progress} message="Initialising AI model…" />
    );
  }

  // ---- Fatal error ----
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Text style={styles.errorHint}>
            Check the Logs tab for more details
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Chat UI ----
  return (
    <SafeAreaView style={styles.container}>
      <ChatHeader
        title={currentTitle}
        onNewChat={handleNewChat}
        disabled={!isReady || chat.isGenerating}
      />
      <KeyboardAvoidingView
        style={styles.content}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 56 + insets.bottom}
      >
        <MessageList
          messages={chat.messages}
          streamingContent={chat.streamingContent}
          isGenerating={chat.isGenerating}
        />
        <InputBar
          onSend={chat.sendMessage}
          disabled={!isReady}
          isGenerating={chat.isGenerating}
        />
      </KeyboardAvoidingView>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#EF4444",
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: "#E5E7EB",
    textAlign: "center",
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
  },
});
