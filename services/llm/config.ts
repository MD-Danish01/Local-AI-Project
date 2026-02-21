import type { ModelConfig } from "@/types/llm";

export const QWEN_MODEL_CONFIG: ModelConfig = {
  id: "qwen2.5-0.5b-q4",
  name: "Qwen2.5 0.5B Q4",
  // Direct HuggingFace download URL (resolve/ gives the raw file)
  url: "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_0.gguf",
  // Local filename saved to device storage
  localFileName: "qwen2.5-0.5b-instruct-q4_0.gguf",
  size: 397 * 1024 * 1024, // ~397 MB
  contextLength: 2048, // Increased for better multi-turn context
};

export const DEFAULT_GENERATION_OPTIONS = {
  maxTokens: 256,
  temperature: 0.4, // Lower temperature for more accurate, context-aware responses
  topP: 0.9,
  topK: 40,
  repeatPenalty: 1.1,
  stopSequences: ["<|im_end|>"],
};

/**
 * Chat history settings for context-aware generation
 */
export const CHAT_HISTORY_CONFIG = {
  /** Maximum number of previous messages to include in prompt */
  maxMessages: 10,
  /** Include system prompt in every request */
  includeSystemPrompt: true,
};
