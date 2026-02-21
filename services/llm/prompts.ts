import type { Message } from "@/types/chat";
import { CHAT_HISTORY_CONFIG } from "./config";

export interface PromptOptions {
  /** Maximum messages to include (default: from config) */
  maxMessages?: number;
  /** System prompt (default: helpful assistant) */
  systemPrompt?: string;
}

/**
 * Build Qwen2.5 formatted prompt from message history
 * Format: <|im_start|>role\ncontent\n<|im_end|>
 *
 * @param messages - Full message history
 * @param options - Prompt building options
 * @returns Formatted prompt string with last N messages for context
 */
export function buildQwenPrompt(
  messages: Message[],
  options: PromptOptions = {},
): string {
  const {
    maxMessages = CHAT_HISTORY_CONFIG.maxMessages,
    systemPrompt = "You are a helpful AI assistant.",
  } = options;

  // Take only the last N messages to keep context manageable
  const recentMessages =
    messages.length > maxMessages ? messages.slice(-maxMessages) : messages;

  let prompt = `<|im_start|>system\n${systemPrompt}\n<|im_end|>\n`;

  for (const msg of recentMessages) {
    prompt += `<|im_start|>${msg.role}\n${msg.content}\n<|im_end|>\n`;
  }

  prompt += `<|im_start|>assistant\n`;
  return prompt;
}

/**
 * Get estimated token count for a message (rough approximation)
 * ~4 characters per token for English text
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
