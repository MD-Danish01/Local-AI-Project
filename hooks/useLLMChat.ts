import { databaseService } from "@/services/database/DatabaseService";
import { llmService } from "@/services/llm/LLMService";
import { buildPrompt } from "@/services/llm/prompts";
import { autoGenerateTitle } from "@/services/llm/titleGenerator";
import { loggingService } from "@/services/logging/LoggingService";
import type { Message } from "@/types/chat";
import { parseThinkingResponse } from "@/utils/thinkingParser";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseLLMChatOptions {
  /** Callback when conversation title is auto-generated */
  onTitleGenerated?: () => void;
}

export function useLLMChat(
  conversationId: number,
  options: UseLLMChatOptions = {},
) {
  const { onTitleGenerated } = options;
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to latest messages so sendMessage always sees current state
  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Load chat history on mount
  useEffect(() => {
    // Don't load if conversationId is 0 or null (not ready yet)
    if (!conversationId) {
      loggingService.debug(
        "Chat",
        "Skipping history load: no conversation ID yet",
      );
      return;
    }

    async function loadHistory() {
      try {
        loggingService.info("Chat", "Loading chat history", { conversationId });
        console.log("📚 Loading chat history...");

        // Wait a bit for database to be ready
        await new Promise((resolve) => setTimeout(resolve, 100));

        const history = await databaseService.getMessages(conversationId);
        setMessages(history);
        loggingService.info(
          "Chat",
          `Loaded ${history.length} messages from history`,
        );
        console.log(`✅ Loaded ${history.length} messages`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        loggingService.error("Chat", "Failed to load chat history", {
          error: errorMsg,
        });
        console.error("❌ Failed to load history:", err);

        // Don't fail completely, just log and continue
        setMessages([]);
      }
    }

    loadHistory();
  }, [conversationId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isGenerating) {
        loggingService.warn(
          "Chat",
          "Skipping send: empty message or already generating",
        );
        console.log("⚠️  Skipping: empty message or already generating");
        return;
      }

      setError(null);
      loggingService.info("Chat", "User sending message", {
        contentLength: content.length,
        preview: content.substring(0, 50),
      });
      console.log("💬 Sending message:", content.substring(0, 50) + "...");

      // Add user message to UI
      const userMessage: Omit<Message, "id" | "createdAt"> = {
        conversationId,
        role: "user",
        content: content.trim(),
      };

      const tempUserMsg = { ...userMessage, id: Date.now() } as Message;

      // IMPORTANT: Snapshot messages BEFORE setMessages or any await,
      // because React may re-render during awaits and sync the ref,
      // which would cause the user message to appear twice in the prompt.
      const previousMessages = [...messagesRef.current];
      const existingCount = previousMessages.length;

      setMessages((prev) => [...prev, tempUserMsg]);

      try {
        // Save user message to database
        await databaseService.saveMessage(userMessage);
        loggingService.info("Chat", "User message saved to database");
        console.log("✅ User message saved");

        // Check if LLM is ready
        if (!llmService.isReady()) {
          const error =
            "LLM is not ready. Please wait for initialization to complete.";
          loggingService.error("Chat", error);
          setError(error);
          return;
        }

        // Start generation
        setIsGenerating(true);
        setStreamingContent("");

        // Build prompt: previous history + new user message (no duplicates)
        const allMessages = [...previousMessages, tempUserMsg];
        const prompt = buildPrompt(allMessages, {
          chatTemplate: llmService.chatTemplate,
        });

        loggingService.debug("Chat", "Prompt built with history context", {
          previousCount: existingCount,
          totalMessages: allMessages.length,
          promptLength: prompt.length,
        });
        console.log(
          `📝 Prompt built: ${existingCount} history + 1 new = ${allMessages.length} messages, length: ${prompt.length}`,
        );

        // Generate response with streaming
        let fullResponse = "";
        loggingService.info("Chat", "Starting AI generation");

        await llmService.generate(prompt, {}, (token) => {
          fullResponse += token;
          setStreamingContent(fullResponse);
        });

        loggingService.info("Chat", "Generation complete", {
          responseLength: fullResponse.length,
        });
        console.log("✅ Generation complete, length:", fullResponse.length);

        // Parse thinking and main response
        const parsed = parseThinkingResponse(fullResponse);
        loggingService.debug("Chat", "Parsed response", {
          thinkingLength: parsed.thinking.length,
          mainResponseLength: parsed.mainResponse.length,
          hasThinking: parsed.thinking.length > 0,
        });
        console.log("🧠 Thinking tokens:", parsed.thinking.length);
        console.log("💬 Response tokens:", parsed.mainResponse.length);

        // Add assistant message with separated thinking
        const assistantMessage: Omit<Message, "id" | "createdAt"> = {
          conversationId,
          role: "assistant",
          content: parsed.mainResponse,
          thinking: parsed.thinking || undefined,
        };

        setMessages((prev) => [...prev, assistantMessage as Message]);
        await databaseService.saveMessage(assistantMessage);
        loggingService.info("Chat", "Assistant message saved to database");
        console.log("✅ Assistant message saved");

        // Auto-generate title after each exchange while title is still "New Chat".
        // This handles the case where the first message was just a greeting —
        // the title generator will skip greetings and wait for a real query.
        autoGenerateTitle(conversationId)
          .then(() => {
            onTitleGenerated?.();
          })
          .catch((err) => {
            console.log("Failed to auto-generate title:", err);
          });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Generation failed";
        loggingService.error("Chat", "Failed to generate response", {
          error: errMsg,
          stack: err instanceof Error ? err.stack : undefined,
        });
        setError(errMsg);
        console.error("❌ Failed to generate response:", err);
      } finally {
        setIsGenerating(false);
        setStreamingContent("");
      }
    },
    [conversationId, isGenerating, onTitleGenerated],
  );

  const clearHistory = useCallback(async () => {
    try {
      console.log("🗑️  Clearing conversation history...");
      await databaseService.deleteConversation(conversationId);
      setMessages([]);
      console.log("✅ History cleared");
    } catch (err) {
      console.error("❌ Failed to clear history:", err);
    }
  }, [conversationId]);

  return {
    messages,
    isGenerating,
    streamingContent,
    error,
    sendMessage,
    clearHistory,
  };
}
