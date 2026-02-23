import { loggingService } from "@/services/logging/LoggingService";
import type { ModelInfo } from "@/types/llm";

// expo-file-system v19 removed DownloadResumable from its public TS types.
// The implementation still lives in the legacy sub-module which Metro resolves
// at runtime. We load it via require() and declare only what we need.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LegacyFS = require("expo-file-system/legacy") as {
  documentDirectory: string | null;
  getInfoAsync(uri: string): Promise<{ exists: boolean; size?: number }>;
  deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void>;
  createDownloadResumable(
    uri: string,
    fileUri: string,
    options: Record<string, unknown>,
    callback?: (d: {
      totalBytesWritten: number;
      totalBytesExpectedToWrite: number;
    }) => void,
  ): {
    downloadAsync(): Promise<{ uri: string } | undefined>;
    pauseAsync(): Promise<void>;
    cancelAsync(): Promise<void>;
  };
};

export type DownloadProgressCallback = (
  progress: number,
  downloadedBytes: number,
  totalBytes: number,
) => void;

type DownloadHandle = ReturnType<typeof LegacyFS.createDownloadResumable>;

/**
 * ModelDownloadService
 * Handles checking, downloading and deleting GGUF model files
 * Supports multiple models with individual tracking
 */
export class ModelDownloadService {
  private static instance: ModelDownloadService;

  /** Active download handles indexed by model ID */
  private downloadHandles: Map<string, DownloadHandle> = new Map();

  /** Document directory for storing models */
  private readonly docDir: string;

  private constructor() {
    this.docDir = LegacyFS.documentDirectory ?? "";
    if (!this.docDir) {
      loggingService.error('Download', 'Document directory not available');
      throw new Error('Document directory not available');
    }
  }

  static getInstance(): ModelDownloadService {
    if (!ModelDownloadService.instance) {
      ModelDownloadService.instance = new ModelDownloadService();
    }
    return ModelDownloadService.instance;
  }

  /**
   * Get full path for a model file
   */
  getModelPath(fileName: string): string {
    return `${this.docDir}${fileName}`;
  }

  /**
   * Check if a specific model file exists and is valid
   */
  async isModelDownloaded(fileName: string): Promise<boolean> {
    try {
      const modelPath = this.getModelPath(fileName);
      const info = await LegacyFS.getInfoAsync(modelPath);
      
      if (!info.exists) {
        loggingService.debug('Download', 'Model file does not exist', { fileName });
        return false;
      }
      
      // Guard against zero-byte or very small partial files
      if (info.size !== undefined && info.size < 1024 * 1024) {
        loggingService.warn('Download', 'Model file too small, treating as incomplete', {
          fileName,
          size: info.size,
        });
        return false;
      }
      
      loggingService.debug('Download', 'Model file exists and valid', {
        fileName,
        size: info.size,
      });
      return true;
    } catch (error) {
      loggingService.error('Download', 'Error checking model file', { fileName, error });
      return false;
    }
  }

  /**
   * Download a model with real-time progress reports
   * @param model Model information including URL and filename
   * @param onProgress Called repeatedly with progress updates
   * @param onComplete Called when download finishes successfully
   * @param onError Called on any failure
   */
  async downloadModel(
    model: ModelInfo,
    onProgress: DownloadProgressCallback,
    onComplete: (localPath: string) => void,
    onError: (err: Error) => void,
  ): Promise<void> {
    const modelPath = this.getModelPath(model.fileName);

    try {
      loggingService.info('Download', 'Starting model download', {
        modelId: model.id,
        fileName: model.fileName,
        url: model.url,
        destination: modelPath,
        sizeBytes: model.sizeBytes,
      });
      console.log(`⬇️  Starting download: ${model.name}`);
      console.log(`   URL: ${model.url}`);
      console.log(`   Dest: ${modelPath}`);

      // Validate URL
      if (!model.url) {
        throw new Error('Model URL is required for download');
      }

      // Remove any left-over partial file
      await this.deleteModelFile(model.fileName);

      // Create download handle
      const downloadHandle = LegacyFS.createDownloadResumable(
        model.url,
        modelPath,
        {},
        ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
          const total = totalBytesExpectedToWrite > 0
            ? totalBytesExpectedToWrite
            : (model.sizeBytes || 500 * 1024 * 1024); // Default 500MB if unknown
          
          const pct = Math.min(100, (totalBytesWritten / total) * 100);
          onProgress(pct, totalBytesWritten, total);
        },
      );

      // Store handle for potential cancellation
      this.downloadHandles.set(model.id, downloadHandle);

      // Start download
      const result = await downloadHandle.downloadAsync();

      // Remove handle after completion
      this.downloadHandles.delete(model.id);

      if (!result?.uri) {
        throw new Error('Download finished but no file URI was returned');
      }

      // Verify downloaded file
      const fileInfo = await LegacyFS.getInfoAsync(result.uri);
      if (!fileInfo.exists) {
        throw new Error('Downloaded file does not exist');
      }

      loggingService.info('Download', 'Model downloaded successfully', {
        modelId: model.id,
        path: result.uri,
        size: fileInfo.size,
      });
      console.log(`✅ Downloaded: ${model.name}`);
      console.log(`   Path: ${result.uri}`);
      console.log(`   Size: ${this.formatBytes(fileInfo.size || 0)}`);

      onComplete(result.uri);
    } catch (err) {
      // Remove handle
      this.downloadHandles.delete(model.id);

      const error = err instanceof Error ? err : new Error(String(err));
      loggingService.error('Download', 'Model download failed', {
        modelId: model.id,
        error: error.message,
      });
      console.error(`❌ Download failed: ${model.name}`, error.message);

      // Clean up partial file
      await this.deleteModelFile(model.fileName).catch(() => {});

      onError(error);
    }
  }

  /**
   * Pause a specific model download
   */
  async pauseDownload(modelId: string): Promise<void> {
    const handle = this.downloadHandles.get(modelId);
    if (handle) {
      await handle.pauseAsync();
      loggingService.info('Download', 'Download paused', { modelId });
      console.log(`⏸  Download paused: ${modelId}`);
    }
  }

  /**
   * Cancel a specific model download and clean up
   */
  async cancelDownload(modelId: string, fileName: string): Promise<void> {
    const handle = this.downloadHandles.get(modelId);
    
    if (handle) {
      try {
        await handle.cancelAsync();
      } catch (error) {
        loggingService.warn('Download', 'Error canceling download', { modelId, error });
      }
      this.downloadHandles.delete(modelId);
    }

    // Clean up partial file
    await this.deleteModelFile(fileName).catch(() => {});
    
    loggingService.info('Download', 'Download cancelled', { modelId });
    console.log(`🚫 Download cancelled: ${modelId}`);
  }

  /**
   * Delete a specific model file from storage
   */
  async deleteModelFile(fileName: string): Promise<void> {
    try {
      const modelPath = this.getModelPath(fileName);
      const info = await LegacyFS.getInfoAsync(modelPath);
      
      if (info.exists) {
        await LegacyFS.deleteAsync(modelPath, { idempotent: true });
        loggingService.info('Download', 'Model file deleted', { fileName, path: modelPath });
        console.log(`🗑  Deleted: ${fileName}`);
      }
    } catch (err) {
      loggingService.warn('Download', 'Could not delete model file', { fileName, error: err });
      console.warn('Could not delete model file:', err);
    }
  }

  /**
   * Get formatted file size string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
  }

  /**
   * Get human-readable model size string from bytes
   */
  getFormattedSize(sizeBytes?: number): string {
    if (!sizeBytes) return 'Unknown size';
    return this.formatBytes(sizeBytes);
  }

  /**
   * Check if a model is currently downloading
   */
  isDownloading(modelId: string): boolean {
    return this.downloadHandles.has(modelId);
  }

  /**
   * Get list of currently downloading model IDs
   */
  getActiveDownloads(): string[] {
    return Array.from(this.downloadHandles.keys());
  }

  /**
   * Cancel all active downloads
   */
  async cancelAllDownloads(): Promise<void> {
    const modelIds = this.getActiveDownloads();
    
    loggingService.info('Download', 'Cancelling all downloads', { count: modelIds.length });
    
    for (const modelId of modelIds) {
      const handle = this.downloadHandles.get(modelId);
      if (handle) {
        try {
          await handle.cancelAsync();
        } catch (error) {
          loggingService.warn('Download', 'Error canceling download', { modelId, error });
        }
      }
    }
    
    this.downloadHandles.clear();
    loggingService.info('Download', 'All downloads cancelled');
  }
}

export const modelDownloadService = ModelDownloadService.getInstance();
