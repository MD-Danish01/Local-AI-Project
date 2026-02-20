import { loggingService } from "@/services/logging/LoggingService";
import type { GenerateOptions } from "@/types/llm";
import { RunAnywhere } from "@runanywhere/core";
import { DEFAULT_GENERATION_OPTIONS, QWEN_MODEL_CONFIG } from "./config";

/**
 * LLMService handles text generation using the RunAnywhere LlamaCpp SDK
 */
class LLMService {
  private modelId = QWEN_MODEL_CONFIG.id;
  private isInitialized = false;
  private isModelLoaded = false;

  async initialize(modelPath: string): Promise<void> {
    if (this.isInitialized) {
      loggingService.warn("LLM", "Model already initialized, skipping");
      return;
    }

    try {
      loggingService.info("LLM", "Initializing LLM with RunAnywhere SDK", {
        modelPath,
      });

      // Validate model path exists
      if (!modelPath || modelPath.trim() === "") {
        throw new Error("Invalid model path: path is empty");
      }

      loggingService.debug("LLM", `Loading model from: ${modelPath}`);

      // Load the model into memory using RunAnywhere SDK
      await RunAnywhere.loadModel(modelPath);

      this.isModelLoaded = true;
      this.isInitialized = true;
      loggingService.info("LLM", "LLM initialized successfully");
    } catch (error) {
      this.isInitialized = false;
      this.isModelLoaded = false;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      loggingService.error("LLM", "LLM initialization failed", {
        error: errorMessage,
        modelPath,
      });
      throw new Error(`Failed to initialize LLM: ${errorMessage}`);
    }
  }

  async generate(
    prompt: string,
    options: Partial<GenerateOptions> = {},
    onToken?: (token: string) => void,
  ): Promise<string> {
    if (!this.isInitialized || !this.isModelLoaded) {
      const error = "LLM not initialized. Call initialize() first.";
      loggingService.error("LLM", error);
      throw new Error(error);
    }

    const finalOptions = { ...DEFAULT_GENERATION_OPTIONS, ...options };

    try {
      loggingService.info("LLM", "Starting text generation", {
        promptLength: prompt.length,
        maxTokens: finalOptions.maxTokens,
        temperature: finalOptions.temperature,
        streaming: !!onToken,
      });

      if (onToken) {
        // Streaming generation
        loggingService.debug("LLM", "Using streaming mode");
        const streamResult = await RunAnywhere.generateStream(prompt, {
          maxTokens: finalOptions.maxTokens,
          temperature: finalOptions.temperature,
          topP: finalOptions.topP,
          stopSequences: finalOptions.stopSequences,
        });

        let fullResponse = "";
        let tokenCount = 0;

        for await (const token of streamResult.stream) {
          fullResponse += token;
          tokenCount++;
          onToken(token);
        }

        const result = await streamResult.result;
        loggingService.info("LLM", "Generation complete (streaming)", {
          tokensGenerated: result.tokensUsed || tokenCount,
          responseLength: fullResponse.length,
        });

        return fullResponse;
      } else {
        // Non-streaming generation
        loggingService.debug("LLM", "Using non-streaming mode");
        const result = await RunAnywhere.generate(prompt, {
          maxTokens: finalOptions.maxTokens,
          temperature: finalOptions.temperature,
          topP: finalOptions.topP,
          stopSequences: finalOptions.stopSequences,
        });

        loggingService.info("LLM", "Generation complete (non-streaming)", {
          tokensGenerated: result.tokensUsed || result.text.split(" ").length,
          responseLength: result.text.length,
        });

        return result.text;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      loggingService.error("LLM", "Generation failed", {
        error: errorMessage,
        promptLength: prompt.length,
      });
      throw new Error(`Generation failed: ${errorMessage}`);
    }
  }

  async stopGeneration(): Promise<void> {
    loggingService.info("LLM", "Stopping generation...");
    try {
      await RunAnywhere.cancelGeneration();
      loggingService.info("LLM", "Generation cancelled successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      loggingService.error("LLM", "Failed to cancel generation", {
        error: errorMessage,
      });
    }
  }

  async unload(): Promise<void> {
    if (this.isModelLoaded) {
      loggingService.info("LLM", "Unloading model...");
      try {
        await RunAnywhere.unloadModel();
        this.isModelLoaded = false;
        this.isInitialized = false;
        loggingService.info("LLM", "Model unloaded successfully");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        loggingService.error("LLM", "Failed to unload model", {
          error: errorMessage,
        });
      }
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.isModelLoaded;
  }
}

export const llmService = new LLMService();
