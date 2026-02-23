import { loggingService } from '@/services/logging/LoggingService';

/**
 * HuggingFaceUrlParser
 * Handles parsing and validation of Hugging Face model URLs
 */
export class HuggingFaceUrlParser {
  /**
   * Convert blob URL to resolve URL for direct download
   * Input: https://huggingface.co/user/repo/blob/main/file.gguf
   * Output: https://huggingface.co/user/repo/resolve/main/file.gguf
   */
  static convertBlobToResolve(url: string): string {
    if (url.includes('/resolve/')) {
      return url; // Already a resolve URL
    }
    
    if (url.includes('/blob/')) {
      return url.replace('/blob/', '/resolve/');
    }
    
    loggingService.warn('URLParser', 'URL is not a blob or resolve URL', { url });
    return url;
  }

  /**
   * Extract model filename from URL
   */
  static extractFileName(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      if (fileName && fileName.endsWith('.gguf')) {
        return fileName;
      }
      
      loggingService.error('URLParser', 'Could not extract valid filename from URL', { url });
      return null;
    } catch (error) {
      loggingService.error('URLParser', 'Invalid URL format', { url, error });
      return null;
    }
  }

  /**
   * Extract model name from filename
   * Example: "Qwen3-0.6B-Q4_0.gguf" → "Qwen3 0.6B Q4"
   */
  static extractModelName(fileName: string): string {
    // Remove .gguf extension
    let name = fileName.replace('.gguf', '');
    
    // Replace common separators with spaces
    name = name.replace(/[-_]/g, ' ');
    
    // Capitalize first letter
    name = name.charAt(0).toUpperCase() + name.slice(1);
    
    return name;
  }

  /**
   * Extract quantization level from filename
   * Example: "model-Q4_0.gguf" → "Q4_0"
   */
  static extractQuantization(fileName: string): string {
    const quantMatch = fileName.match(/[Qq](\d+)[_-]?(\d+|K|M)/);
    if (quantMatch) {
      return `Q${quantMatch[1]}${quantMatch[2] ? '_' + quantMatch[2] : ''}`.toUpperCase();
    }
    return 'Q4_0'; // Default
  }

  /**
   * Validate if URL is from Hugging Face
   */
  static isValidHuggingFaceUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'huggingface.co' && url.endsWith('.gguf');
    } catch {
      return false;
    }
  }

  /**
   * Parse full URL and extract all metadata
   */
  static parseUrl(url: string): {
    isValid: boolean;
    downloadUrl: string;
    fileName: string | null;
    modelName: string | null;
    quantization: string;
    error?: string;
  } {
    try {
      // Validate URL
      if (!this.isValidHuggingFaceUrl(url)) {
        return {
          isValid: false,
          downloadUrl: url,
          fileName: null,
          modelName: null,
          quantization: 'Q4_0',
          error: 'Invalid Hugging Face URL. Must be from huggingface.co and end with .gguf',
        };
      }

      // Convert to resolve URL
      const downloadUrl = this.convertBlobToResolve(url);

      // Extract filename
      const fileName = this.extractFileName(downloadUrl);
      if (!fileName) {
        return {
          isValid: false,
          downloadUrl,
          fileName: null,
          modelName: null,
          quantization: 'Q4_0',
          error: 'Could not extract filename from URL',
        };
      }

      // Extract model name and quantization
      const modelName = this.extractModelName(fileName);
      const quantization = this.extractQuantization(fileName);

      loggingService.info('URLParser', 'URL parsed successfully', {
        downloadUrl,
        fileName,
        modelName,
        quantization,
      });

      return {
        isValid: true,
        downloadUrl,
        fileName,
        modelName,
        quantization,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      loggingService.error('URLParser', 'Failed to parse URL', { url, error: errorMsg });
      
      return {
        isValid: false,
        downloadUrl: url,
        fileName: null,
        modelName: null,
        quantization: 'Q4_0',
        error: errorMsg,
      };
    }
  }

  /**
   * Generate a unique model ID from URL
   */
  static generateModelId(fileName: string): string {
    return fileName.replace('.gguf', '').toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }
}
