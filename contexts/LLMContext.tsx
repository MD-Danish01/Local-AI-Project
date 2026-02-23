import { databaseService } from "@/services/database/DatabaseService";
import { enrichModelInfo } from "@/services/llm/config";
import { llmService } from "@/services/llm/LLMService";
import { modelDownloadService } from "@/services/llm/ModelDownloadService";
import { modelService } from "@/services/llm/ModelService";
import { loggingService } from "@/services/logging/LoggingService";
import { modelRegistry } from "@/services/models/ModelRegistry";
import type { Conversation } from "@/types/chat";
import type { ModelInfo } from "@/types/llm";
import { ModelLoadingState } from "@/types/llm";
import { RunAnywhere, SDKEnvironment } from "@runanywhere/core";
import { LlamaCPP } from "@runanywhere/llamacpp";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

interface LLMContextType {
  /** Model is loaded and LLM is ready to generate */
  isReady: boolean;
  /** App is initialising DB / loading model into memory */
  isLoading: boolean;
  /** No model selected yet */
  needsModelSelection: boolean;
  /** Waiting for user to press Download */
  needsDownload: boolean;
  /** Download is actively in progress */
  isDownloading: boolean;
  /** 0-100 during download or model-load phase */
  progress: number;
  /** Bytes received so far (during download) */
  downloadedBytes: number;
  /** Total expected bytes (during download) */
  totalBytes: number;
  error: string | null;
  conversationId: number | null;
  /** Currently active model */
  activeModel: ModelInfo | null;
  /** All conversations for history */
  conversations: Conversation[];
  /** Call this when the user taps the Download button for a model */
  startDownload: (model: ModelInfo) => void;
  /** Call this to cancel an in-flight download */
  cancelDownload: () => void;
  /** Create a new chat and switch to it */
  createNewChat: () => Promise<number>;
  /** Switch to an existing conversation */
  switchConversation: (id: number) => void;
  /** Refresh conversations list from database */
  refreshConversations: () => Promise<void>;
  /** Delete a conversation */
  deleteConversation: (id: number) => Promise<void>;
}

const LLMContext = createContext<LLMContextType | undefined>(undefined);

export function LLMProvider({ children }: { children: React.ReactNode }) {
  const [appState, setAppState] = useState<ModelLoadingState>(
    ModelLoadingState.IDLE,
  );
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeModel, setActiveModel] = useState<ModelInfo | null>(null);
  const [downloadingModel, setDownloadingModel] = useState<ModelInfo | null>(
    null,
  );

  // ------------------------------------------------------------------
  // Conversation management functions
  // ------------------------------------------------------------------
  const refreshConversations = useCallback(async () => {
    try {
      const convos = await databaseService.getConversations();
      setConversations(convos);
    } catch (err) {
      loggingService.error("App", "Failed to refresh conversations", {
        error: err,
      });
    }
  }, []);

  const createNewChat = useCallback(async (): Promise<number> => {
    try {
      const newId = await databaseService.createConversation("New Chat");
      loggingService.info("App", "Created new conversation", { id: newId });
      setConversationId(newId);
      await refreshConversations();
      return newId;
    } catch (err) {
      loggingService.error("App", "Failed to create new chat", { error: err });
      throw err;
    }
  }, [refreshConversations]);

  const switchConversation = useCallback((id: number) => {
    loggingService.info("App", "Switching conversation", { id });
    setConversationId(id);
  }, []);

  const deleteConversation = useCallback(
    async (id: number) => {
      try {
        await databaseService.deleteConversation(id);
        loggingService.info("App", "Deleted conversation", { id });
        await refreshConversations();

        // If we deleted the current conversation, switch to another or create new
        if (id === conversationId) {
          const remaining = await databaseService.getConversations();
          if (remaining.length > 0) {
            setConversationId(remaining[0].id!);
          } else {
            const newId = await createNewChat();
            setConversationId(newId);
          }
        }
      } catch (err) {
        loggingService.error("App", "Failed to delete conversation", {
          error: err,
        });
        throw err;
      }
    },
    [conversationId, refreshConversations, createNewChat],
  );

  // ------------------------------------------------------------------
  // Step A: initialise app and check for active model
  // ------------------------------------------------------------------
  useEffect(() => {
    async function initApp() {
      try {
        loggingService.info("App", "Starting app initialization");
        console.log("🚀 Starting app initialisation…");

        // 0. Initialize RunAnywhere SDK
        setProgress(5);
        loggingService.info("App", "Initializing RunAnywhere SDK");
        console.log("🔧 Initializing RunAnywhere SDK...");
        await RunAnywhere.initialize({
          environment: SDKEnvironment.Development,
          debug: true,
        });

        // Register LlamaCPP backend
        loggingService.info("App", "Registering LlamaCPP backend");
        LlamaCPP.register();
        loggingService.info("App", "RunAnywhere SDK ready");
        console.log("✅ RunAnywhere SDK ready");

        // 1. Init database
        setProgress(10);
        await databaseService.initialize();
        loggingService.info("App", "Database initialized");
        console.log("✅ Database ready");

        // 2. Initialize model registry (adds default models)
        setProgress(15);
        loggingService.info("App", "Initializing model registry");
        await modelRegistry.initialize();
        console.log("✅ Model registry ready");

        // 3. Load conversations and create new chat for fresh start
        setProgress(20);
        const existingConversations = await databaseService.getConversations();
        setConversations(existingConversations);

        // Always start with a new chat
        const newId = await databaseService.createConversation("New Chat");
        setConversationId(newId);

        // Update conversations list with the new one
        const updatedConversations = await databaseService.getConversations();
        setConversations(updatedConversations);
        console.log("✅ Conversation ready");

        // 4. Check for active model
        setProgress(30);
        loggingService.info("App", "Checking for active model");
        const activeModelInfo = await modelService.checkActiveModel();

        if (activeModelInfo === null) {
          // No model selected yet - show model selection screen
          loggingService.warn(
            "App",
            "No model selected, showing selection screen",
          );
          console.log("📋 No model selected – user needs to choose");
          setProgress(0);
          setAppState(ModelLoadingState.NO_MODEL);
          return;
        }

        if (activeModelInfo === undefined) {
          // Model selected but not downloaded
          const model = await modelRegistry.getActiveModel();
          setActiveModel(model);
          loggingService.warn("App", "Active model not downloaded", {
            modelId: model?.id,
          });
          console.log(`📥 Model not downloaded: ${model?.name}`);
          setProgress(0);
          setAppState(ModelLoadingState.NOT_DOWNLOADED);
          return;
        }

        // Model is downloaded and ready - load it
        setActiveModel(activeModelInfo);
        await loadModel(activeModelInfo);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Initialisation failed";
        loggingService.error("App", "Initialization failed", { error: msg });
        setError(msg);
        setAppState(ModelLoadingState.ERROR);
        console.error("❌ Init failed:", msg);
      }
    }

    initApp();
  }, []);

  // ------------------------------------------------------------------
  // Load model into memory (after download or on subsequent launches)
  // ------------------------------------------------------------------
  async function loadModel(modelInfo: ModelInfo) {
    try {
      // Enrich with chatTemplate & stopSequences from config defaults
      const enriched = enrichModelInfo(modelInfo);

      setAppState(ModelLoadingState.LOADING);
      setProgress(50);
      loggingService.info("App", "Loading model into LLM engine", {
        modelId: enriched.id,
        chatTemplate: enriched.chatTemplate,
      });
      console.log(
        `📦 Loading model: ${enriched.name} (template: ${enriched.chatTemplate})`,
      );

      const modelPath = await modelService.prepareModel(enriched);
      setProgress(80);

      await llmService.initialize(modelPath, enriched);
      setProgress(100);

      setAppState(ModelLoadingState.READY);
      loggingService.info("App", "LLM ready for inference");
      console.log("🎉 LLM ready!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load model";
      loggingService.error("App", "Model loading failed", { error: msg });
      setError(msg);
      setAppState(ModelLoadingState.ERROR);
      console.error("❌ Model load failed:", msg);
    }
  }

  // ------------------------------------------------------------------
  // User-initiated download
  // ------------------------------------------------------------------
  const startDownload = useCallback((model: ModelInfo) => {
    loggingService.info("App", "User initiated model download", {
      modelId: model.id,
    });
    setDownloadingModel(model);
    setAppState(ModelLoadingState.DOWNLOADING);
    setProgress(0);
    setDownloadedBytes(0);
    setTotalBytes(0);
    setError(null);

    // Update model status to downloading
    modelRegistry.updateModelStatus(model.id, "downloading").catch((err) => {
      loggingService.error("App", "Failed to update model status", {
        error: err,
      });
    });

    modelDownloadService.downloadModel(
      model,
      // onProgress
      (pct: number, received: number, total: number) => {
        setProgress(pct);
        setDownloadedBytes(received);
        setTotalBytes(total);
      },
      // onComplete
      async (localPath: string) => {
        loggingService.info("App", "Download complete, loading model", {
          modelId: model.id,
          path: localPath,
        });
        console.log("✅ Download complete, loading model…");

        // Update model status to downloaded
        await modelRegistry.updateModelStatus(
          model.id,
          "downloaded",
          localPath,
        );

        // Set as active model
        await modelRegistry.setActiveModel(model.id);

        // Get updated model info
        const updatedModel = await modelRegistry.getModel(model.id);
        if (updatedModel) {
          setActiveModel(updatedModel);
          await loadModel(updatedModel);
        }

        setDownloadingModel(null);
      },
      // onError
      (err: Error) => {
        loggingService.error("App", "Download error", {
          modelId: model.id,
          error: err.message,
        });
        setError(err.message);
        setAppState(ModelLoadingState.NOT_DOWNLOADED);
        console.error("❌ Download error:", err.message);

        // Update model status to error
        modelRegistry.updateModelStatus(model.id, "error").catch((e) => {
          loggingService.error("App", "Failed to update model status", {
            error: e,
          });
        });

        setDownloadingModel(null);
      },
    );
  }, []);

  const cancelDownload = useCallback(async () => {
    if (downloadingModel) {
      loggingService.info("App", "User cancelled download", {
        modelId: downloadingModel.id,
      });
      await modelDownloadService.cancelDownload(
        downloadingModel.id,
        downloadingModel.fileName,
      );

      // Update model status back to available
      await modelRegistry.updateModelStatus(downloadingModel.id, "available");

      setAppState(ModelLoadingState.NOT_DOWNLOADED);
      setProgress(0);
      setDownloadedBytes(0);
      setTotalBytes(0);
      setDownloadingModel(null);
    }
  }, [downloadingModel]);

  // ------------------------------------------------------------------
  // Derived booleans
  // ------------------------------------------------------------------
  const value: LLMContextType = {
    isReady: appState === ModelLoadingState.READY,
    isLoading:
      appState === ModelLoadingState.IDLE ||
      appState === ModelLoadingState.LOADING,
    needsModelSelection: appState === ModelLoadingState.NO_MODEL,
    needsDownload: appState === ModelLoadingState.NOT_DOWNLOADED,
    isDownloading: appState === ModelLoadingState.DOWNLOADING,
    progress,
    downloadedBytes,
    totalBytes,
    error,
    conversationId,
    activeModel,
    conversations,
    startDownload,
    cancelDownload,
    createNewChat,
    switchConversation,
    refreshConversations,
    deleteConversation,
  };

  return <LLMContext.Provider value={value}>{children}</LLMContext.Provider>;
}

export function useLLMContext() {
  const context = useContext(LLMContext);
  if (!context) {
    throw new Error("useLLMContext must be used within LLMProvider");
  }
  return context;
}
