import { databaseService } from '@/services/database/DatabaseService';
import { loggingService } from '@/services/logging/LoggingService';
import type { ModelInfo, CustomModelInput } from '@/types/llm';
import { DEFAULT_MODELS } from '@/services/llm/config';
import { HuggingFaceUrlParser } from './HuggingFaceUrlParser';

/**
 * ModelRegistry
 * High-level service for managing AI models
 */
export class ModelRegistry {
  private static instance: ModelRegistry;

  private constructor() {}

  static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  /**
   * Initialize model registry with default models
   * Called once during app startup
   */
  async initialize(): Promise<void> {
    try {
      loggingService.info('ModelRegistry', 'Initializing model registry');

      // Get existing models
      const existingModels = await databaseService.getModels();
      
      // Add default models if they don't exist
      for (const defaultModel of DEFAULT_MODELS) {
        const exists = existingModels.find(m => m.id === defaultModel.id);
        
        if (!exists) {
          loggingService.info('ModelRegistry', 'Adding default model to registry', {
            modelId: defaultModel.id,
          });

          const modelInfo: Omit<ModelInfo, 'createdAt'> = {
            id: defaultModel.id,
            name: defaultModel.name,
            fileName: defaultModel.localFileName,
            url: defaultModel.url,
            sizeBytes: defaultModel.size,
            quantization: defaultModel.quantization || 'Q4_0',
            contextLength: defaultModel.contextLength,
            isActive: false,
            source: 'default',
            status: 'available',
            description: defaultModel.description,
            minRamMB: defaultModel.minRamMB,
          };

          await databaseService.addModel(modelInfo);
        }
      }

      loggingService.info('ModelRegistry', 'Model registry initialized successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      loggingService.error('ModelRegistry', 'Failed to initialize registry', { error: errorMsg });
      throw error;
    }
  }

  /**
   * Get all registered models
   */
  async getAllModels(): Promise<ModelInfo[]> {
    try {
      return await databaseService.getModels();
    } catch (error) {
      loggingService.error('ModelRegistry', 'Failed to get models', { error });
      return [];
    }
  }

  /**
   * Get currently active model
   */
  async getActiveModel(): Promise<ModelInfo | null> {
    try {
      return await databaseService.getActiveModel();
    } catch (error) {
      loggingService.error('ModelRegistry', 'Failed to get active model', { error });
      return null;
    }
  }

  /**
   * Set a model as active (only one can be active at a time)
   */
  async setActiveModel(modelId: string): Promise<void> {
    try {
      loggingService.info('ModelRegistry', 'Setting active model', { modelId });
      
      // Check if model exists and is downloaded
      const model = await databaseService.getModel(modelId);
      if (!model) {
        throw new Error(`Model not found: ${modelId}`);
      }

      if (model.status !== 'downloaded') {
        throw new Error(`Model is not downloaded: ${modelId}`);
      }

      await databaseService.setActiveModel(modelId);
      loggingService.info('ModelRegistry', 'Active model set successfully', { modelId });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      loggingService.error('ModelRegistry', 'Failed to set active model', {
        error: errorMsg,
        modelId,
      });
      throw error;
    }
  }

  /**
   * Add a custom model from URL
   */
  async addCustomModelFromUrl(input: CustomModelInput): Promise<ModelInfo> {
    try {
      loggingService.info('ModelRegistry', 'Adding custom model from URL', {
        name: input.name,
        url: input.url,
      });

      // Parse and validate URL
      const parsed = HuggingFaceUrlParser.parseUrl(input.url);
      if (!parsed.isValid || !parsed.fileName) {
        throw new Error(parsed.error || 'Invalid URL');
      }

      // Generate model ID
      const modelId = HuggingFaceUrlParser.generateModelId(parsed.fileName);

      // Check if model already exists
      const existing = await databaseService.getModel(modelId);
      if (existing) {
        loggingService.warn('ModelRegistry', 'Model already exists', { modelId });
        return existing;
      }

      // Create model info
      const modelInfo: Omit<ModelInfo, 'createdAt'> = {
        id: modelId,
        name: input.name,
        fileName: parsed.fileName,
        url: parsed.downloadUrl,
        quantization: input.quantization || parsed.quantization,
        contextLength: input.contextLength || 2048,
        isActive: false,
        source: 'url',
        status: 'available',
        description: input.description,
      };

      await databaseService.addModel(modelInfo);
      
      loggingService.info('ModelRegistry', 'Custom model added successfully', { modelId });
      
      // Return the created model
      const created = await databaseService.getModel(modelId);
      if (!created) {
        throw new Error('Failed to retrieve created model');
      }
      
      return created;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      loggingService.error('ModelRegistry', 'Failed to add custom model', {
        error: errorMsg,
        url: input.url,
      });
      throw error;
    }
  }

  /**
   * Add a model from device file
   */
  async addModelFromFile(
    fileName: string,
    localPath: string,
    sizeBytes: number,
    customName?: string
  ): Promise<ModelInfo> {
    try {
      loggingService.info('ModelRegistry', 'Adding model from file', {
        fileName,
        localPath,
        sizeBytes,
      });

      // Extract metadata
      const metadata = HuggingFaceUrlParser.extractModelName(fileName);
      const quantization = HuggingFaceUrlParser.extractQuantization(fileName);
      const modelId = HuggingFaceUrlParser.generateModelId(fileName);

      // Check if model already exists
      const existing = await databaseService.getModel(modelId);
      if (existing) {
        loggingService.warn('ModelRegistry', 'Model already exists', { modelId });
        return existing;
      }

      // Create model info
      const modelInfo: Omit<ModelInfo, 'createdAt'> = {
        id: modelId,
        name: customName || metadata,
        fileName,
        localPath,
        sizeBytes,
        quantization,
        contextLength: 2048,
        isActive: false,
        source: 'file',
        status: 'downloaded', // Already on device
        description: 'Imported from device storage',
      };

      await databaseService.addModel(modelInfo);
      
      loggingService.info('ModelRegistry', 'Model from file added successfully', { modelId });
      
      // Return the created model
      const created = await databaseService.getModel(modelId);
      if (!created) {
        throw new Error('Failed to retrieve created model');
      }
      
      return created;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      loggingService.error('ModelRegistry', 'Failed to add model from file', {
        error: errorMsg,
        fileName,
      });
      throw error;
    }
  }

  /**
   * Update model download status
   */
  async updateModelStatus(
    modelId: string,
    status: 'available' | 'downloading' | 'downloaded' | 'error',
    localPath?: string
  ): Promise<void> {
    try {
      await databaseService.updateModelStatus(modelId, status, localPath);
      loggingService.debug('ModelRegistry', 'Model status updated', { modelId, status });
    } catch (error) {
      loggingService.error('ModelRegistry', 'Failed to update model status', {
        error,
        modelId,
        status,
      });
      throw error;
    }
  }

  /**
   * Delete a model from registry
   */
  async deleteModel(modelId: string): Promise<void> {
    try {
      loggingService.info('ModelRegistry', 'Deleting model', { modelId });

      const model = await databaseService.getModel(modelId);
      if (!model) {
        throw new Error(`Model not found: ${modelId}`);
      }

      if (model.isActive) {
        throw new Error('Cannot delete active model. Please activate another model first.');
      }

      await databaseService.deleteModel(modelId);
      loggingService.info('ModelRegistry', 'Model deleted successfully', { modelId });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      loggingService.error('ModelRegistry', 'Failed to delete model', {
        error: errorMsg,
        modelId,
      });
      throw error;
    }
  }

  /**
   * Get a specific model by ID
   */
  async getModel(modelId: string): Promise<ModelInfo | null> {
    try {
      return await databaseService.getModel(modelId);
    } catch (error) {
      loggingService.error('ModelRegistry', 'Failed to get model', { error, modelId });
      return null;
    }
  }

  /**
   * Check if any model is active
   */
  async hasActiveModel(): Promise<boolean> {
    const activeModel = await this.getActiveModel();
    return activeModel !== null;
  }

  /**
   * Get downloaded models (status = 'downloaded')
   */
  async getDownloadedModels(): Promise<ModelInfo[]> {
    const allModels = await this.getAllModels();
    return allModels.filter(m => m.status === 'downloaded');
  }

  /**
   * Get available models for download (status = 'available')
   */
  async getAvailableModels(): Promise<ModelInfo[]> {
    const allModels = await this.getAllModels();
    return allModels.filter(m => m.status === 'available');
  }
}

export const modelRegistry = ModelRegistry.getInstance();
