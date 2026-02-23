/**
 * Chat template identifier — determines how prompts are formatted.
 * "chatml"  → Qwen / Qwen3 / ChatML-compatible models
 * "gemma"   → Gemma 3 models (<start_of_turn> / <end_of_turn>)
 */
export type ChatTemplate = "chatml" | "gemma";

export interface ModelConfig {
  id: string;
  name: string;
  /** Remote URL to download from */
  url: string;
  /** Filename used when saving to device storage */
  localFileName: string;
  size: number;
  contextLength: number;
  quantization?: string;
  description?: string;
  minRamMB?: number;
  /** Prompt format to use (default: "chatml") */
  chatTemplate?: ChatTemplate;
  /** Model-specific stop sequences (overrides default if set) */
  stopSequences?: string[];
}

export interface ModelInfo {
  id: string;
  name: string;
  fileName: string;
  url?: string;
  sizeBytes?: number;
  quantization: string;
  contextLength: number;
  isActive: boolean;
  source: "default" | "url" | "file";
  status: "available" | "downloading" | "downloaded" | "error";
  localPath?: string;
  description?: string;
  minRamMB?: number;
  /** Prompt format (default: "chatml") */
  chatTemplate?: ChatTemplate;
  /** Model-specific stop sequences */
  stopSequences?: string[];
  createdAt?: Date;
}

export interface CustomModelInput {
  name: string;
  url: string;
  quantization?: string;
  contextLength?: number;
  description?: string;
}

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  stopSequences?: string[];
}

export enum ModelLoadingState {
  IDLE = "idle",
  /** No model selected yet */
  NO_MODEL = "no_model",
  /** Model file not present; waiting for user to initiate download */
  NOT_DOWNLOADED = "not_downloaded",
  DOWNLOADING = "downloading",
  LOADING = "loading",
  READY = "ready",
  ERROR = "error",
}
