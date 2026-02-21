import { databaseService } from "@/services/database/DatabaseService";
import { loggingService } from "@/services/logging/LoggingService";
import type { Message } from "@/types/chat";
import { llmService } from "./LLMService";

const TITLE_SYSTEM_PROMPT = `You are a title generator. Create a very short title (3-5 words max) that summarizes the conversation topic. Only output the title, nothing else. No quotes, no punctuation at the end.`;

/**
 * Generate a chat title from the first few messages of a conversation
 */
export async function generateChatTitle(messages: Message[]): Promise<string> {
  if (messages.length === 0) {
    return "New Chat";
  }

  // Take only first 2-3 exchanges for title generation
  const contextMessages = messages.slice(0, Math.min(4, messages.length));

  // Build a simple summary of the conversation start
  const conversationPreview = contextMessages
    .map((m) => `${m.role}: ${m.content.substring(0, 100)}`)
    .join("\n");

  const prompt = `<|im_start|>system
${TITLE_SYSTEM_PROMPT}
<|im_end|>
<|im_start|>user
Generate a short title for this conversation:

${conversationPreview}
<|im_end|>
<|im_start|>assistant
`;

  try {
    if (!llmService.isReady()) {
      loggingService.warn("TitleGen", "LLM not ready, using fallback title");
      return generateFallbackTitle(messages);
    }

    let title = "";
    await llmService.generate(
      prompt,
      {
        maxTokens: 20,
        temperature: 0.3, // Lower temperature for more focused titles
      },
      (token) => {
        title += token;
      },
    );

    // Clean up the title
    title = title
      .replace(/<\|im_end\|>/g, "")
      .replace(/["']/g, "")
      .trim()
      .split("\n")[0] // Take only first line
      .substring(0, 50); // Max 50 chars

    if (!title || title.length < 2) {
      return generateFallbackTitle(messages);
    }

    loggingService.info("TitleGen", "Generated title", { title });
    return title;
  } catch (error) {
    loggingService.error("TitleGen", "Failed to generate title", { error });
    return generateFallbackTitle(messages);
  }
}

/**
 * Fallback title generation using first message content
 */
function generateFallbackTitle(messages: Message[]): string {
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (!firstUserMessage) {
    return "New Chat";
  }

  // Take first few words of the message
  const words = firstUserMessage.content.trim().split(/\s+/);
  const title = words.slice(0, 5).join(" ");

  return title.length > 40 ? title.substring(0, 37) + "..." : title;
}

/**
 * Auto-generate and save title for a conversation after first exchange
 */
export async function autoGenerateTitle(conversationId: number): Promise<void> {
  try {
    // Check if conversation already has a custom title
    const conversation = await databaseService.getConversation(conversationId);
    if (
      !conversation ||
      (conversation.title !== "New Chat" && conversation.title !== "My Chat")
    ) {
      return; // Already has a custom title
    }

    // Get messages for title generation
    const messages = await databaseService.getMessages(conversationId);
    if (messages.length < 2) {
      return; // Need at least one exchange
    }

    const title = await generateChatTitle(messages);
    await databaseService.updateConversationTitle(conversationId, title);

    loggingService.info("TitleGen", "Auto-generated title saved", {
      conversationId,
      title,
    });
  } catch (error) {
    loggingService.error("TitleGen", "Failed to auto-generate title", {
      error,
    });
  }
}
