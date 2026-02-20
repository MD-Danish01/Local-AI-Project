import type { ModelConfig } from '@/types/llm';

export const QWEN_MODEL_CONFIG: ModelConfig = {
  id: 'qwen2.5-0.5b-q4',
  name: 'Qwen2.5 0.5B Q4',
  // Direct HuggingFace download URL (resolve/ gives the raw file)
  url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_0.gguf',
  // Local filename saved to device storage
  localFileName: 'qwen2.5-0.5b-instruct-q4_0.gguf',
  size: 397 * 1024 * 1024, // ~397 MB
  contextLength: 1024,
};

export const DEFAULT_GENERATION_OPTIONS = {
  maxTokens: 256,
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  repeatPenalty: 1.1,
  stopSequences: ['<|im_end|>'],
};
