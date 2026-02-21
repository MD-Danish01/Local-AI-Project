import { databaseService } from "@/services/database/DatabaseService";
import { llmService } from "@/services/llm/LLMService";
import { modelDownloadService } from "@/services/llm/ModelDownloadService";
import { modelService } from "@/services/llm/ModelService";
import { loggingService } from "@/services/logging/LoggingService";
import type { Conversation } from "@/types/chat";
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
  /** All conversations for history */
  conversations: Conversation[];
  /** Call this when the user taps the Download button */
  startDownload: () => void;
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

        // If we deleted the current conversation, switch to another or create new
        if (id === conversationId) {
          const remaining = conversations.filter((c) => c.id !== id);
          if (remaining.length > 0) {
            setConversationId(remaining[0].id!);
          } else {
            await createNewChat();
          }
        }
        await refreshConversations();
      } catch (err) {
        loggingService.error("App", "Failed to delete conversation", {
          error: err,
        });
      }
    },
    [conversationId, conversations, createNewChat, refreshConversations],
  );

  // ------------------------------------------------------------------
  // Step A: initialise DB and check whether the model is already present
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
        console.log("✅ Database ready");

        // 2. Load conversations and create new chat for fresh start
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

        // 3. Check if model file exists
        setProgress(30);
        const localPath = await modelService.checkModel();

        if (!localPath) {
          // Model not on device – ask user to download
          console.log("📥 Model not present – waiting for user download");
          setProgress(0);
          setAppState(ModelLoadingState.NOT_DOWNLOADED);
          return;
        }

        // 4. Model already downloaded – load it straight away
        await loadModel(localPath);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Initialisation failed";
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
  async function loadModel(localPath: string) {
    try {
      setAppState(ModelLoadingState.LOADING);
      setProgress(50);
      console.log("📦 Loading model into LLM engine…");

      const modelPath = await modelService.prepareFromLocalPath(localPath);
      setProgress(80);

      await llmService.initialize(modelPath);
      setProgress(100);

      setAppState(ModelLoadingState.READY);
      console.log("🎉 LLM ready!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load model";
      setError(msg);
      setAppState(ModelLoadingState.ERROR);
      console.error("❌ Model load failed:", msg);
    }
  }

  // ------------------------------------------------------------------
  // User-initiated download
  // ------------------------------------------------------------------
  const startDownload = useCallback(() => {
    setAppState(ModelLoadingState.DOWNLOADING);
    setProgress(0);
    setDownloadedBytes(0);
    setTotalBytes(0);
    setError(null);

    modelDownloadService.downloadModel(
      // onProgress
      (pct, received, total) => {
        setProgress(pct);
        setDownloadedBytes(received);
        setTotalBytes(total);
      },
      // onComplete
      async (localPath) => {
        console.log("✅ Download complete, loading model…");
        await loadModel(localPath);
      },
      // onError
      (err) => {
        setError(err.message);
        setAppState(ModelLoadingState.NOT_DOWNLOADED);
        console.error("❌ Download error:", err.message);
      },
    );
  }, []);

  const cancelDownload = useCallback(async () => {
    await modelDownloadService.cancelDownload();
    setAppState(ModelLoadingState.NOT_DOWNLOADED);
    setProgress(0);
    setDownloadedBytes(0);
    setTotalBytes(0);
  }, []);

  // ------------------------------------------------------------------
  // Derived booleans
  // ------------------------------------------------------------------
  const value: LLMContextType = {
    isReady: appState === ModelLoadingState.READY,
    isLoading:
      appState === ModelLoadingState.IDLE ||
      appState === ModelLoadingState.LOADING,
    needsDownload: appState === ModelLoadingState.NOT_DOWNLOADED,
    isDownloading: appState === ModelLoadingState.DOWNLOADING,
    progress,
    downloadedBytes,
    totalBytes,
    error,
    conversationId,
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
