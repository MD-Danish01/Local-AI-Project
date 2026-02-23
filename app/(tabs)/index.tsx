import { ChatHeader } from "@/components/chat/ChatHeader";
import { InputBar } from "@/components/chat/InputBar";
import { MessageList } from "@/components/chat/MessageList";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ModelDownloadScreen } from "@/components/ui/ModelDownloadScreen";
import { useLLMContext } from "@/contexts/LLMContext";
import { useLLMChat } from "@/hooks/useLLMChat";
import React, { useCallback, useMemo } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet
} from "react-native";

export default function ChatScreen() {
  const {
    isReady,
    isLoading,
    needsDownload,
    isDownloading,
    progress,
    downloadedBytes,
    totalBytes,
    error,
    conversationId,
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

  // ---- Model not yet on device ----
  if (needsDownload || isDownloading) {
    return (
      <ModelDownloadScreen
        isDownloading={isDownloading}
        progress={progress}
        downloadedBytes={downloadedBytes}
        totalBytes={totalBytes}
        error={error}
        onStartDownload={startDownload}
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
    return <LoadingScreen progress={0} message={`Error: ${error}`} />;
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
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
});
