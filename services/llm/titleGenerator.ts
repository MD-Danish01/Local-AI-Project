import { databaseService } from "@/services/database/DatabaseService";
import { loggingService } from "@/services/logging/LoggingService";
import type { Message } from "@/types/chat";
import { llmService } from "./LLMService";

/** Greetings that aren't useful for titles */
const GREETING_PATTERNS =
  /^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening)|howdy|yo|sup|what'?s\s*up)[\s!?.]*$/i;

/**
 * Check if a message is just a greeting with no real content
 */
function isGreeting(text: string): boolean {
  return GREETING_PATTERNS.test(text.trim());
}

/**
 * Find the first substantive user message (skip greetings)
 */
function findSubstantiveUserMessage(messages: Message[]): Message | null {
  for (const msg of messages) {
    if (msg.role === "user" && !isGreeting(msg.content)) {
      return msg;
    }
  }
  return null;
}

/**
 * Generate a chat title using the LLM with few-shot examples
 */
export async function generateChatTitle(messages: Message[]): Promise<string> {
  if (messages.length === 0) return "New Chat";

  const substantive = findSubstantiveUserMessage(messages);
  if (!substantive) {
    // Only greetings so far — don't generate yet
    return "New Chat";
  }

  // Use only user messages for the title prompt (avoids leaking model responses)
  const userQueries = messages
    .filter((m) => m.role === "user" && !isGreeting(m.content))
    .slice(0, 3)
    .map((m) => m.content.substring(0, 120))
    .join("; ");

  // Few-shot prompt — gives the small model clear examples to imitate
  const prompt = `<|im_start|>system
You generate a short chat title (2-5 words) from the user's query. Output ONLY the title. No quotes. No explanation.
<|im_end|>
<|im_start|>user
Query: How many states and union territories in India
<|im_end|>
<|im_start|>assistant
Indian States & Territories
<|im_end|>
<|im_start|>user
Query: Explain how photosynthesis works
<|im_end|>
<|im_start|>assistant
Photosynthesis Explained
<|im_end|>
<|im_start|>user
Query: Write a Python function to sort a list
<|im_end|>
<|im_start|>assistant
Python List Sorting
<|im_end|>
<|im_start|>user
Query: ${userQueries}
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
        maxTokens: 15,
        temperature: 0.2,
      },
      (token) => {
        title += token;
      },
    );

    // Clean up
    title = title
      .replace(/<\|im_end\|>/g, "")
      .replace(/<\|im_start\|>[\s\S]*/g, "") // Stop at any new turn
      .replace(/["'`]/g, "")
      .replace(/[.!?:]+$/g, "") // Strip trailing punctuation
      .replace(/^(title|topic|subject)\s*:\s*/i, "") // Strip "Title:" prefix
      .trim()
      .split("\n")[0] // First line only
      .substring(0, 40);

    // Validate: reject if it looks like a full response rather than a title
    if (!title || title.length < 2 || title.split(/\s+/).length > 10) {
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
 * Fallback: extract a clean title from the first substantive user message
 */
function generateFallbackTitle(messages: Message[]): string {
  const substantive = findSubstantiveUserMessage(messages);
  if (!substantive) {
    // If only greetings, use first user message
    const first = messages.find((m) => m.role === "user");
    return first
      ? capitalise(first.content.trim().split(/\s+/).slice(0, 4).join(" "))
      : "New Chat";
  }

  const words = substantive.content.trim().split(/\s+/);
  const title = words.slice(0, 5).join(" ");
  return capitalise(title.length > 40 ? title.substring(0, 37) + "…" : title);
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Auto-generate and save title for a conversation after an exchange.
 * Skips generation if only greetings have been exchanged so far —
 * title will be generated once a real question arrives.
 */
export async function autoGenerateTitle(conversationId: number): Promise<void> {
  try {
    const conversation = await databaseService.getConversation(conversationId);
    if (
      !conversation ||
      (conversation.title !== "New Chat" && conversation.title !== "My Chat")
    ) {
      return; // Already has a custom title
    }

    const messages = await databaseService.getMessages(conversationId);
    if (messages.length < 2) {
      return; // Need at least one exchange
    }

    // Don't generate a title if only greetings so far
    const hasSubstantive = findSubstantiveUserMessage(messages);
    if (!hasSubstantive) {
      loggingService.debug(
        "TitleGen",
        "Only greetings so far, skipping title generation",
      );
      return;
    }

    const title = await generateChatTitle(messages);
    if (title === "New Chat") return; // Nothing useful yet

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
