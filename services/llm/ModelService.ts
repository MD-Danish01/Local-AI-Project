import { ModelLoadingState } from "@/types/llm";
import { QWEN_MODEL_CONFIG } from "./config";
import { modelDownloadService } from "./ModelDownloadService";
import { loggingService } from "@/services/logging/LoggingService";

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
    loggingService.info('Model', 'Checking if model exists on device');
    const downloaded = await modelDownloadService.isModelDownloaded();
    if (!downloaded) {
      loggingService.warn('Model', 'Model not found on device');
      this.modelLoadingState = ModelLoadingState.NOT_DOWNLOADED;
      return undefined;
    }
    loggingService.info('Model', 'Model found on device', { path: modelDownloadService.modelPath });
    return modelDownloadService.modelPath;
  }

  /**
   * Called after a successful download to hand the path to the LLM engine.
   */
  async prepareFromLocalPath(localPath: string): Promise<string> {
    try {
      this.modelLoadingState = ModelLoadingState.LOADING;
      loggingService.info('Model', 'Preparing model from local path', { path: localPath });
      console.log("📦 Preparing model from local path:", localPath);

      // Validate the path format
      if (!localPath || !localPath.includes('.gguf')) {
        throw new Error(`Invalid model path format: ${localPath}`);
      }

      this.modelLocalUri = localPath;
      this.modelLoadingState = ModelLoadingState.READY;
      loggingService.info('Model', 'Model prepared successfully');
      console.log("✅ Model ready");

      return this.modelLocalUri;
    } catch (error) {
      this.modelLoadingState = ModelLoadingState.ERROR;
      const errorMessage = error instanceof Error ? error.message : String(error);
      loggingService.error('Model', 'Failed to prepare model', { error: errorMessage, path: localPath });
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
