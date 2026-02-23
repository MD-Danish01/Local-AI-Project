import type { ChatTemplate, ModelConfig, ModelInfo } from "@/types/llm";

export const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: "qwen3-0.6b-q4",
    name: "Qwen3 0.6B (Recommended)",
    url: "https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_0.gguf",
    localFileName: "Qwen3-0.6B-Q4_0.gguf",
    size: 430 * 1024 * 1024, // ~430 MB
    contextLength: 4096,
    quantization: "Q4_0",
    description:
      "Fast and efficient, great for 4GB RAM devices. Good balance of speed and quality.",
    minRamMB: 2048,
    chatTemplate: "chatml",
    stopSequences: ["<|im_end|>", "<|endoftext|>"],
  },
  {
    id: "gemma-3-1b-q4",
    name: "Gemma 3 1B (Better Quality)",
    url: "https://huggingface.co/unsloth/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_0.gguf",
    localFileName: "gemma-3-1b-it-Q4_0.gguf",
    size: 670 * 1024 * 1024, // ~670 MB
    contextLength: 8192,
    quantization: "Q4_0",
    description:
      "Better responses and longer context. Recommended for 6GB+ RAM devices.",
    minRamMB: 4096,
    chatTemplate: "gemma",
    stopSequences: ["<end_of_turn>", "<eos>"],
  },
];

// For backward compatibility - first model is default
export const QWEN_MODEL_CONFIG: ModelConfig = DEFAULT_MODELS[0];

export const DEFAULT_GENERATION_OPTIONS = {
  maxTokens: 1024,
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  repeatPenalty: 1.15,
  // Default stop sequences (ChatML / Qwen).
  // These are overridden at runtime when a model specifies its own.
  stopSequences: ["<|im_end|>", "<|endoftext|>"],
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

/**
 * Enrich a ModelInfo (from DB) with chatTemplate & stopSequences
 * from the matching DEFAULT_MODELS entry. Falls back to ChatML defaults.
 */
export function enrichModelInfo(model: ModelInfo): ModelInfo {
  // Already enriched?
  if (model.chatTemplate && model.stopSequences) return model;

  const defaultDef = DEFAULT_MODELS.find((d) => d.id === model.id);

  return {
    ...model,
    chatTemplate:
      model.chatTemplate ??
      (defaultDef?.chatTemplate as ChatTemplate) ??
      "chatml",
    stopSequences:
      model.stopSequences ??
      defaultDef?.stopSequences ??
      DEFAULT_GENERATION_OPTIONS.stopSequences,
  };
}
