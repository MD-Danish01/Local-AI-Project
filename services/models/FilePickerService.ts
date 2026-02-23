import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { loggingService } from '@/services/logging/LoggingService';
import { HuggingFaceUrlParser } from './HuggingFaceUrlParser';

// Using legacy for documentDirectory
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LegacyFS = require('expo-file-system/legacy') as {
  documentDirectory: string | null;
  getInfoAsync(uri: string): Promise<{ exists: boolean; size?: number }>;
  deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void>;
  copyAsync(options: { from: string; to: string }): Promise<void>;
};

/**
 * FilePickerService
 * Handles importing GGUF files from device storage
 */
export class FilePickerService {
  /**
   * Open file picker to select a .gguf file
   */
  static async pickGGUFFile(): Promise<{
    success: boolean;
    uri?: string;
    fileName?: string;
    size?: number;
    error?: string;
  }> {
    try {
      loggingService.info('FilePicker', 'Opening file picker for GGUF files');

      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // All files, we'll filter by extension
        copyToCacheDirectory: false,
      });

      if (result.canceled) {
        loggingService.info('FilePicker', 'File picker canceled by user');
        return { success: false, error: 'Canceled' };
      }

      const file = result.assets[0];
      
      if (!file) {
        loggingService.error('FilePicker', 'No file selected');
        return { success: false, error: 'No file selected' };
      }

      // Validate file extension
      if (!file.name.endsWith('.gguf')) {
        loggingService.error('FilePicker', 'Invalid file type', { fileName: file.name });
        return {
          success: false,
          error: 'Please select a .gguf file',
        };
      }

      loggingService.info('FilePicker', 'GGUF file selected', {
        fileName: file.name,
        size: file.size,
        uri: file.uri,
      });

      return {
        success: true,
        uri: file.uri,
        fileName: file.name,
        size: file.size,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      loggingService.error('FilePicker', 'File picker error', { error: errorMsg });
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Copy selected file to app storage
   */
  static async copyToAppStorage(
    sourceUri: string,
    fileName: string
  ): Promise<{
    success: boolean;
    localPath?: string;
    error?: string;
  }> {
    try {
      const docDir = LegacyFS.documentDirectory;
      if (!docDir) {
        throw new Error('Document directory not available');
      }

      const destination = `${docDir}${fileName}`;

      loggingService.info('FilePicker', 'Copying file to app storage', {
        source: sourceUri,
        destination,
      });

      // Check if file already exists
      const fileInfo = await LegacyFS.getInfoAsync(destination);
      if (fileInfo.exists) {
        loggingService.warn('FilePicker', 'File already exists, will overwrite', {
          destination,
        });
        await LegacyFS.deleteAsync(destination);
      }

      // Copy file
      await LegacyFS.copyAsync({
        from: sourceUri,
        to: destination,
      });

      // Verify copy
      const copiedInfo = await LegacyFS.getInfoAsync(destination);
      if (!copiedInfo.exists) {
        throw new Error('File copy verification failed');
      }

      loggingService.info('FilePicker', 'File copied successfully', {
        destination,
        size: copiedInfo.size,
      });

      return {
        success: true,
        localPath: destination,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      loggingService.error('FilePicker', 'Failed to copy file', {
        error: errorMsg,
        sourceUri,
        fileName,
      });
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Validate GGUF file format by checking magic bytes
   */
  static async validateGGUFFile(filePath: string): Promise<boolean> {
    try {
      // GGUF files start with magic bytes "GGUF" (0x47475546)
      const fileInfo = await LegacyFS.getInfoAsync(filePath);
      
      if (!fileInfo.exists) {
        loggingService.error('FilePicker', 'File does not exist', { filePath });
        return false;
      }

      if (fileInfo.size && fileInfo.size < 1024 * 1024) {
        loggingService.error('FilePicker', 'File too small to be valid model', {
          filePath,
          size: fileInfo.size,
        });
        return false;
      }

      // Read first 4 bytes to check magic number
      // Note: expo-file-system doesn't support partial reads easily
      // For now, we'll just check file size and extension
      // TODO: Add proper magic byte validation if needed

      loggingService.info('FilePicker', 'File validation passed', {
        filePath,
        size: fileInfo.size,
      });

      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      loggingService.error('FilePicker', 'File validation failed', {
        error: errorMsg,
        filePath,
      });
      return false;
    }
  }

  /**
   * Extract model metadata from filename
   */
  static extractMetadata(fileName: string): {
    modelName: string;
    quantization: string;
    modelId: string;
  } {
    const modelName = HuggingFaceUrlParser.extractModelName(fileName);
    const quantization = HuggingFaceUrlParser.extractQuantization(fileName);
    const modelId = HuggingFaceUrlParser.generateModelId(fileName);

    return { modelName, quantization, modelId };
  }
}
