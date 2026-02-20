import { InputBar } from "@/components/chat/InputBar";
import { MessageList } from "@/components/chat/MessageList";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ModelDownloadScreen } from "@/components/ui/ModelDownloadScreen";
import { useLLMContext } from "@/contexts/LLMContext";
import { useLLMChat } from "@/hooks/useLLMChat";
import React from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";

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
    startDownload,
    cancelDownload,
  } = useLLMContext();

  const chat = useLLMChat(conversationId || 0);

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
      <View style={styles.content}>
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
      </View>
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
});
