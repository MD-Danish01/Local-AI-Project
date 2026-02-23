import { databaseService } from "@/services/database/DatabaseService";
import { loggingService } from "@/services/logging/LoggingService";
import type { Message } from "@/types/chat";
import { stripThinkingTags } from "@/utils/thinkingParser";
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
 * Generate a chat title using the LLM with few-shot examples.
 * Builds the prompt in the correct format for the currently loaded model.
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

  // Build prompt in the correct format for the loaded model
  const template = llmService.chatTemplate;
  const prompt =
    template === "gemma"
      ? buildGemmaTitlePrompt(userQueries)
      : buildChatMLTitlePrompt(userQueries);

  try {
    if (!llmService.isReady()) {
      loggingService.warn("TitleGen", "LLM not ready, using fallback title");
      return generateFallbackTitle(messages);
    }

    let title = "";
    await llmService.generate(
      prompt,
      {
        maxTokens: 8, // Strictly enforce 2-3 words
        temperature: 0.1, // Lower temperature for more consistent short titles
        stopSequences: [...llmService.stopSequences, "\n", "<think>", "."],
      },
      (token) => {
        title += token;
      },
    );

    // Clean up and strip any thinking tags or template tokens
    title = stripThinkingTags(title); // Remove any <think>...</think> content
    title = title
      .replace(/<\|im_end\|>/g, "")
      .replace(/<\|im_start\|>[\s\S]*/g, "") // ChatML turn boundary
      .replace(/<end_of_turn>/g, "") // Gemma turn boundary
      .replace(/<start_of_turn>[\s\S]*/g, "") // Gemma turn boundary
      .replace(/["'`]/g, "")
      .replace(/[.!?:,;]+$/g, "") // Strip trailing punctuation
      .replace(/^(title|topic|subject|chat)\s*:\s*/i, "") // Strip prefixes
      .trim()
      .split("\n")[0] // First line only
      .substring(0, 25); // Limit to 25 chars for 2-3 words

    // Strict validation: enforce 2-3 words only
    const words = title.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;

    if (!title || title.length < 3 || wordCount < 2 || wordCount > 3) {
      loggingService.warn(
        "TitleGen",
        "Title doesn't meet 2-3 word criteria, using fallback",
        {
          title,
          wordCount,
        },
      );
      return generateFallbackTitle(messages);
    }

    loggingService.info("TitleGen", "Generated title", { title, wordCount });
    return title;
  } catch (error) {
    loggingService.error("TitleGen", "Failed to generate title", { error });
    return generateFallbackTitle(messages);
  }
}

/**
 * Fallback: extract a clean title from the first substantive user message
 * Strictly keep it to 2-3 words for consistency
 */
function generateFallbackTitle(messages: Message[]): string {
  const substantive = findSubstantiveUserMessage(messages);
  if (!substantive) {
    // If only greetings, use first user message
    const first = messages.find((m) => m.role === "user");
    if (!first) return "New Chat";

    const words = first.content.trim().split(/\s+/).slice(0, 3);
    return capitalise(words.join(" "));
  }

  // Extract exactly 2-3 words from the substantive message
  const words = substantive.content
    .trim()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .split(/\s+/)
    .filter((w) => w.length > 0);

  // Take 2-3 most meaningful words (skip common words if possible)
  const commonWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
  ]);
  const meaningfulWords = words.filter(
    (w) => !commonWords.has(w.toLowerCase()),
  );

  const selectedWords = (
    meaningfulWords.length >= 2 ? meaningfulWords : words
  ).slice(0, 3);
  const title = selectedWords.join(" ");

  return capitalise(title.length > 25 ? title.substring(0, 22) + "…" : title);
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

// ── Title prompt helpers per template ────────────────────────────────

const TITLE_INSTRUCTION =
  "Generate a concise chat title (2-3 words ONLY) that captures the main topic. Output ONLY the title. No quotes. No punctuation. No explanation.";

function buildChatMLTitlePrompt(userQueries: string): string {
  return `<|im_start|>system
${TITLE_INSTRUCTION}
<|im_end|>
<|im_start|>user
Query: How many states and union territories in India
<|im_end|>
<|im_start|>assistant
Indian States
<|im_end|>
<|im_start|>user
Query: Explain how photosynthesis works
<|im_end|>
<|im_start|>assistant
Photosynthesis Explanation
<|im_end|>
<|im_start|>user
Query: Write a Python function to sort a list
<|im_end|>
<|im_start|>assistant
Python Sorting
<|im_end|>
<|im_start|>user
Query: ${userQueries}
<|im_end|>
<|im_start|>assistant
`;
}

function buildGemmaTitlePrompt(userQueries: string): string {
  return `<start_of_turn>user
${TITLE_INSTRUCTION}

Query: How many states and union territories in India<end_of_turn>
<start_of_turn>model
Indian States<end_of_turn>
<start_of_turn>user
Query: Explain how photosynthesis works<end_of_turn>
<start_of_turn>model
Photosynthesis Explanation<end_of_turn>
<start_of_turn>user
Query: Write a Python function to sort a list<end_of_turn>
<start_of_turn>model
Python Sorting<end_of_turn>
<start_of_turn>user
Query: ${userQueries}<end_of_turn>
<start_of_turn>model
`;
}
