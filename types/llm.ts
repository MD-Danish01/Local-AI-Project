export interface ModelConfig {
  id: string;
  name: string;
  /** Remote URL to download from */
  url: string;
  /** Filename used when saving to device storage */
  localFileName: string;
  size: number;
  contextLength: number;
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
  /** Model file not present; waiting for user to initiate download */
  NOT_DOWNLOADED = "not_downloaded",
  DOWNLOADING = "downloading",
  LOADING = "loading",
  READY = "ready",
  ERROR = "error",
}
