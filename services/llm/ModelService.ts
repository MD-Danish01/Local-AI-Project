import { ModelLoadingState } from "@/types/llm";
import type { ModelInfo } from "@/types/llm";
import { modelDownloadService } from "./ModelDownloadService";
import { loggingService } from "@/services/logging/LoggingService";
import { modelRegistry } from "@/services/models/ModelRegistry";

/**
 * ModelService
 * Validates that models are present on-device and prepares them for loading.
 * Works with ModelRegistry for multi-model support.
 */
export class ModelService {
  private static instance: ModelService;
  private modelLoadingState: ModelLoadingState = ModelLoadingState.IDLE;
  private currentModelInfo: ModelInfo | null = null;

  private constructor() {}

  static getInstance(): ModelService {
    if (!ModelService.instance) {
      ModelService.instance = new ModelService();
    }
    return ModelService.instance;
  }

  /**
   * Check if the active model exists and is downloaded
   * Returns the model info if ready, undefined if needs download, null if no model selected
   */
  async checkActiveModel(): Promise<ModelInfo | undefined | null> {
    try {
      loggingService.info('Model', 'Checking for active model');

      // Get active model from registry
      const activeModel = await modelRegistry.getActiveModel();
      
      if (!activeModel) {
        loggingService.warn('Model', 'No active model selected');
        this.modelLoadingState = ModelLoadingState.NO_MODEL;
        return null;
      }

      loggingService.info('Model', 'Active model found in registry', {
        modelId: activeModel.id,
        status: activeModel.status,
      });

      // Check if model file exists on device
      const isDownloaded = await modelDownloadService.isModelDownloaded(activeModel.fileName);
      
      if (!isDownloaded) {
        loggingService.warn('Model', 'Active model not downloaded yet', {
          modelId: activeModel.id,
        });
        this.modelLoadingState = ModelLoadingState.NOT_DOWNLOADED;
        return undefined;
      }

      // Model is downloaded and ready
      const modelPath = modelDownloadService.getModelPath(activeModel.fileName);
      loggingService.info('Model', 'Active model is downloaded and ready', {
        modelId: activeModel.id,
        path: modelPath,
      });

      this.currentModelInfo = activeModel;
      return activeModel;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      loggingService.error('Model', 'Error checking active model', { error: errorMsg });
      this.modelLoadingState = ModelLoadingState.ERROR;
      throw error;
    }
  }

  /**
   * Check if a specific model is downloaded
   */
  async isModelDownloaded(fileName: string): Promise<boolean> {
    return await modelDownloadService.isModelDownloaded(fileName);
  }

  /**
   * Prepare a model for loading into LLM engine
   * @param modelInfo The model to prepare
   * @returns The local file path
   */
  async prepareModel(modelInfo: ModelInfo): Promise<string> {
    try {
      this.modelLoadingState = ModelLoadingState.LOADING;
      loggingService.info('Model', 'Preparing model for loading', {
        modelId: modelInfo.id,
        fileName: modelInfo.fileName,
      });
      console.log(`📦 Preparing model: ${modelInfo.name}`);

      // Get model path
      const localPath = modelInfo.localPath || modelDownloadService.getModelPath(modelInfo.fileName);

      // Validate the path format
      if (!localPath || !localPath.includes('.gguf')) {
        throw new Error(`Invalid model path format: ${localPath}`);
      }

      // Verify file exists
      const exists = await modelDownloadService.isModelDownloaded(modelInfo.fileName);
      if (!exists) {
        throw new Error(`Model file not found: ${modelInfo.fileName}`);
      }

      this.currentModelInfo = modelInfo;
      this.modelLoadingState = ModelLoadingState.READY;
      
      loggingService.info('Model', 'Model prepared successfully', {
        modelId: modelInfo.id,
        path: localPath,
      });
      console.log(`✅ Model ready: ${modelInfo.name}`);

      return localPath;
    } catch (error) {
      this.modelLoadingState = ModelLoadingState.ERROR;
      const errorMessage = error instanceof Error ? error.message : String(error);
      loggingService.error('Model', 'Failed to prepare model', {
        error: errorMessage,
        modelId: modelInfo.id,
      });
      console.error(`❌ Failed to prepare model: ${modelInfo.name}`, error);
      throw error;
    }
  }

  /**
   * Get the current model loading state
   */
  getState(): ModelLoadingState {
    return this.modelLoadingState;
  }

  /**
   * Get the currently prepared model info
   */
  getCurrentModel(): ModelInfo | null {
    return this.currentModelInfo;
  }

  /**
   * Get model path for a given filename
   */
  getModelPath(fileName: string): string {
    return modelDownloadService.getModelPath(fileName);
  }

  /**
   * Format model size for display
   */
  formatSize(sizeBytes?: number): string {
    return modelDownloadService.getFormattedSize(sizeBytes);
  }
}

export const modelService = ModelService.getInstance();
