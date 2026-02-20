import { File, Paths } from 'expo-file-system';
import { QWEN_MODEL_CONFIG } from './config';
import { loggingService } from '@/services/logging/LoggingService';

// expo-file-system v19 removed DownloadResumable from its public TS types.
// The implementation still lives in the legacy sub-module which Metro resolves
// at runtime. We load it via require() and declare only what we need.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LegacyFS = require('expo-file-system/legacy') as {
  documentDirectory: string | null;
  getInfoAsync(uri: string): Promise<{ exists: boolean; size?: number }>;
  deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void>;
  createDownloadResumable(
    uri: string,
    fileUri: string,
    options: Record<string, unknown>,
    callback?: (d: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void
  ): {
    downloadAsync(): Promise<{ uri: string } | undefined>;
    pauseAsync(): Promise<void>;
    cancelAsync(): Promise<void>;
  };
};

export type DownloadProgressCallback = (progress: number, downloadedBytes: number, totalBytes: number) => void;

type DownloadHandle = ReturnType<typeof LegacyFS.createDownloadResumable>;

/**
 * ModelDownloadService
 * Handles checking, downloading and deleting the GGUF model file
 * on the device's persistent document directory.
 */
export class ModelDownloadService {
  private static instance: ModelDownloadService;

  /** Absolute path where the model is stored on-device */
  readonly modelPath: string;

  private downloadHandle: DownloadHandle | null = null;

  private constructor() {
    const docDir = LegacyFS.documentDirectory ?? '';
    this.modelPath = `${docDir}${QWEN_MODEL_CONFIG.localFileName}`;
  }

  static getInstance(): ModelDownloadService {
    if (!ModelDownloadService.instance) {
      ModelDownloadService.instance = new ModelDownloadService();
    }
    return ModelDownloadService.instance;
  }

  /** Returns true if the model file already exists and looks complete on this device */
  async isModelDownloaded(): Promise<boolean> {
    try {
      const info = await LegacyFS.getInfoAsync(this.modelPath);
      if (!info.exists) return false;
      // Guard against zero-byte or very small partial files
      if (info.size !== undefined && info.size < 1024 * 1024) {
        console.warn('⚠️ Model file found but seems too small – treating as incomplete');
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Download the model with real-time progress reports.
   * @param onProgress  Called repeatedly with (0-100 %, downloaded bytes, total bytes)
   * @param onComplete  Called when the file is fully written to disk
   * @param onError     Called on any failure
   */
  async downloadModel(
    onProgress: DownloadProgressCallback,
    onComplete: (localPath: string) => void,
    onError: (err: Error) => void
  ): Promise<void> {
    try {
      loggingService.info('Download', 'Starting model download from HuggingFace', {
        url: QWEN_MODEL_CONFIG.url,
        destination: this.modelPath,
        size: this.getFormattedSize(),
      });
      console.log('⬇️  Starting model download from HuggingFace…');
      console.log('   URL :', QWEN_MODEL_CONFIG.url);
      console.log('   Dest:', this.modelPath);

      // Remove any left-over partial file
      await this.deleteModel();

      this.downloadHandle = LegacyFS.createDownloadResumable(
        QWEN_MODEL_CONFIG.url,
        this.modelPath,
        {},
        ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
          const total = totalBytesExpectedToWrite > 0
            ? totalBytesExpectedToWrite
            : QWEN_MODEL_CONFIG.size;
          const pct = Math.min(100, (totalBytesWritten / total) * 100);
          onProgress(pct, totalBytesWritten, total);
        }
      );

      const result = await this.downloadHandle.downloadAsync();

      if (!result?.uri) {
        const error = new Error('Download finished but no file URI was returned');
        loggingService.error('Download', 'Download completed but no URI returned');
        throw error;
      }

      loggingService.info('Download', 'Model downloaded successfully', { path: result.uri });
      console.log('✅ Model downloaded to:', result.uri);
      this.downloadHandle = null;
      onComplete(result.uri);
    } catch (err) {
      this.downloadHandle = null;
      const error = err instanceof Error ? err : new Error(String(err));
      loggingService.error('Download', 'Model download failed', { error: error.message });
      console.error('❌ Model download failed:', error.message);
      // Clean up the partial file so next attempt starts fresh
      await this.deleteModel().catch(() => {});
      onError(error);
    }
  }

  /** Pause an in-flight download */
  async pauseDownload(): Promise<void> {
    if (this.downloadHandle) {
      await this.downloadHandle.pauseAsync();
      console.log('⏸  Download paused');
    }
  }

  /** Cancel the current download and delete any partial file */
  async cancelDownload(): Promise<void> {
    if (this.downloadHandle) {
      try {
        await this.downloadHandle.cancelAsync();
      } catch {
        // ignore
      }
      this.downloadHandle = null;
    }
    await this.deleteModel().catch(() => {});
    console.log('🚫 Download cancelled');
  }

  /** Delete the model file from device storage */
  async deleteModel(): Promise<void> {
    try {
      const info = await LegacyFS.getInfoAsync(this.modelPath);
      if (info.exists) {
        await LegacyFS.deleteAsync(this.modelPath, { idempotent: true });
        console.log('🗑  Model file deleted');
      }
    } catch (err) {
      console.warn('Could not delete model file:', err);
    }
  }

  /** Human-readable model size string */
  getFormattedSize(): string {
    const mb = QWEN_MODEL_CONFIG.size / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  }
}

export const modelDownloadService = ModelDownloadService.getInstance();
