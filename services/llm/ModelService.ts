import { ModelLoadingState } from "@/types/llm";
import { QWEN_MODEL_CONFIG } from "./config";
import { modelDownloadService } from "./ModelDownloadService";

/**
 * ModelService
 * Validates that the model is present on-device and returns its local path.
 * Downloading is handled separately by ModelDownloadService.
 */
export class ModelService {
  private static instance: ModelService;
  private modelLoadingState: ModelLoadingState = ModelLoadingState.IDLE;
  private modelLocalUri: string | null = null;

  private constructor() {}

  static getInstance(): ModelService {
    if (!ModelService.instance) {
      ModelService.instance = new ModelService();
    }
    return ModelService.instance;
  }

  /**
   * Check whether the model exists.
   * Returns undefined if NOT downloaded (caller should trigger download UI).
   * Returns the local file path when model is ready.
   */
  async checkModel(): Promise<string | undefined> {
    const downloaded = await modelDownloadService.isModelDownloaded();
    if (!downloaded) {
      this.modelLoadingState = ModelLoadingState.NOT_DOWNLOADED;
      return undefined;
    }
    return modelDownloadService.modelPath;
  }

  /**
   * Called after a successful download to hand the path to the LLM engine.
   */
  async prepareFromLocalPath(localPath: string): Promise<string> {
    try {
      this.modelLoadingState = ModelLoadingState.LOADING;
      console.log("📦 Preparing model from local path:", localPath);

      this.modelLocalUri = localPath;
      this.modelLoadingState = ModelLoadingState.READY;
      console.log("✅ Model ready");

      return this.modelLocalUri;
    } catch (error) {
      this.modelLoadingState = ModelLoadingState.ERROR;
      console.error("❌ Failed to prepare model:", error);
      throw error;
    }
  }

  getState(): ModelLoadingState {
    return this.modelLoadingState;
  }

  getModelUri(): string | null {
    return this.modelLocalUri;
  }

  getConfig() {
    return QWEN_MODEL_CONFIG;
  }
}

export const modelService = ModelService.getInstance();
