import type { Message } from "@/types/chat";
import type { ChatTemplate } from "@/types/llm";
import { CHAT_HISTORY_CONFIG } from "./config";

export interface PromptOptions {
  /** Maximum messages to include (default: from config) */
  maxMessages?: number;
  /** System prompt (default: helpful assistant) */
  systemPrompt?: string;
  /** Chat template to use (default: "chatml") */
  chatTemplate?: ChatTemplate;
}

// ── Default system prompts per template ──────────────────────────────

const CHATML_SYSTEM_PROMPT = `You are a helpful, accurate AI assistant. 

When solving complex problems or answering questions that benefit from reasoning:
- Use <think>...</think> tags to show your step-by-step reasoning process
- Keep thinking concise and focused (2-4 sentences maximum)
- Always close the </think> tag before providing your final answer
- Place your final answer outside the thinking tags

Format:
<think>Brief reasoning here...</think>
Your clear, direct answer here.

For simple questions, respond directly without thinking tags. Always pay close attention to the conversation history above.`;

const GEMMA_SYSTEM_PROMPT = `You are a helpful, accurate AI assistant. Keep answers concise and pay close attention to the conversation history.`;

// ── Public API ───────────────────────────────────────────────────────

/**
 * Build a prompt formatted for the given chat template.
 * Defaults to ChatML (Qwen) when no template is specified.
 */
export function buildPrompt(
  messages: Message[],
  options: PromptOptions = {},
): string {
  const template = options.chatTemplate ?? "chatml";

  switch (template) {
    case "gemma":
      return buildGemmaPrompt(messages, options);
    case "chatml":
    default:
      return buildChatMLPrompt(messages, options);
  }
}

/**
 * @deprecated Use buildPrompt() with chatTemplate option instead.
 * Kept for backward compatibility.
 */
export function buildQwenPrompt(
  messages: Message[],
  options: PromptOptions = {},
): string {
  return buildChatMLPrompt(messages, options);
}

// ── ChatML (Qwen / Qwen3) ───────────────────────────────────────────

function buildChatMLPrompt(
  messages: Message[],
  options: PromptOptions = {},
): string {
  const {
    maxMessages = CHAT_HISTORY_CONFIG.maxMessages,
    systemPrompt = CHATML_SYSTEM_PROMPT,
  } = options;

  const recentMessages =
    messages.length > maxMessages ? messages.slice(-maxMessages) : messages;

  let prompt = `<|im_start|>system\n${systemPrompt}\n<|im_end|>\n`;

  for (const msg of recentMessages) {
    prompt += `<|im_start|>${msg.role}\n${msg.content}\n<|im_end|>\n`;
  }

  prompt += `<|im_start|>assistant\n`;
  return prompt;
}

// ── Gemma 3 ──────────────────────────────────────────────────────────

function buildGemmaPrompt(
  messages: Message[],
  options: PromptOptions = {},
): string {
  const {
    maxMessages = CHAT_HISTORY_CONFIG.maxMessages,
    systemPrompt = GEMMA_SYSTEM_PROMPT,
  } = options;

  const recentMessages =
    messages.length > maxMessages ? messages.slice(-maxMessages) : messages;

  // Gemma uses <start_of_turn> / <end_of_turn>.
  // System instructions are prepended as the first user turn.
  let prompt = "";

  // Prepend system instruction to first user turn
  let systemPrepended = false;

  for (const msg of recentMessages) {
    // Map "assistant" role → "model" for Gemma
    const role = msg.role === "assistant" ? "model" : msg.role;

    if (role === "user" && !systemPrepended) {
      // First user turn: include system prompt
      prompt += `<start_of_turn>user\n${systemPrompt}\n\n${msg.content}<end_of_turn>\n`;
      systemPrepended = true;
    } else if (role === "system") {
      // Skip standalone system messages; already handled above
      continue;
    } else {
      prompt += `<start_of_turn>${role}\n${msg.content}<end_of_turn>\n`;
    }
  }

  // If no user message was found yet, still prepend system
  if (!systemPrepended) {
    prompt = `<start_of_turn>user\n${systemPrompt}<end_of_turn>\n` + prompt;
  }

  prompt += `<start_of_turn>model\n`;
  return prompt;
}

/**
 * Get estimated token count for a message (rough approximation)
 * ~4 characters per token for English text
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
