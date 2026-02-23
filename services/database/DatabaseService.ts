import { loggingService } from "@/services/logging/LoggingService";
import type { Conversation, Message } from "@/types/chat";
import type { ModelInfo } from "@/types/llm";
import * as SQLite from "expo-sqlite";
import { createTablesSQL } from "./schema";

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    try {
      loggingService.info("Database", "Initializing database");
      this.db = await SQLite.openDatabaseAsync("localai.db");
      await this.db.execAsync(createTablesSQL);
      loggingService.info("Database", "Database initialized successfully");
      console.log("✅ Database initialized successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      loggingService.error("Database", "Database initialization failed", {
        error: errorMessage,
      });
      console.error("❌ Database initialization failed:", error);
      throw error;
    }
  }

  async createConversation(title: string = "New Chat"): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.runAsync(
      "INSERT INTO conversations (title) VALUES (?)",
      title,
    );
    return result.lastInsertRowId;
  }

  async getConversations(): Promise<Conversation[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getAllAsync<Conversation>(
      "SELECT * FROM conversations ORDER BY updated_at DESC",
    );
    return result;
  }

  async saveMessage(
    message: Omit<Message, "id" | "createdAt">,
  ): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.runAsync(
      "INSERT INTO messages (conversation_id, role, content, thinking) VALUES (?, ?, ?, ?)",
      message.conversationId,
      message.role,
      message.content,
      message.thinking || null,
    );

    // Update conversation's updated_at timestamp
    await this.db.runAsync(
      "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      message.conversationId,
    );

    return result.lastInsertRowId;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getAllAsync<Message>(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      conversationId,
    );
    return result;
  }

  async deleteConversation(conversationId: number): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      "DELETE FROM conversations WHERE id = ?",
      conversationId,
    );
  }

  async updateConversationTitle(
    conversationId: number,
    title: string,
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      "UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      title,
      conversationId,
    );
    loggingService.info("Database", "Conversation title updated", {
      conversationId,
      title,
    });
  }

  async getConversation(conversationId: number): Promise<Conversation | null> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getFirstAsync<Conversation>(
      "SELECT * FROM conversations WHERE id = ?",
      conversationId,
    );
    return result || null;
  }

  async getMessageCount(conversationId: number): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?",
      conversationId,
    );
    return result?.count || 0;
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.execAsync(`
      DELETE FROM messages;
      DELETE FROM conversations;
    `);
  }

  // ============================================================
  // Model Management Methods
  // ============================================================

  async addModel(model: Omit<ModelInfo, 'createdAt'>): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO models 
        (id, name, file_name, url, size_bytes, quantization, context_length, 
         is_active, source, status, local_path, description, min_ram_mb) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        model.id,
        model.name,
        model.fileName,
        model.url || null,
        model.sizeBytes || null,
        model.quantization,
        model.contextLength,
        model.isActive ? 1 : 0,
        model.source,
        model.status,
        model.localPath || null,
        model.description || null,
        model.minRamMB || null
      );
      loggingService.info("Database", "Model added to registry", { modelId: model.id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      loggingService.error("Database", "Failed to add model", { error: errorMessage, modelId: model.id });
      throw error;
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getAllAsync<any>(
      "SELECT * FROM models ORDER BY created_at DESC"
    );
    
    return result.map(row => ({
      id: row.id,
      name: row.name,
      fileName: row.file_name,
      url: row.url,
      sizeBytes: row.size_bytes,
      quantization: row.quantization,
      contextLength: row.context_length,
      isActive: Boolean(row.is_active),
      source: row.source as 'default' | 'url' | 'file',
      status: row.status as 'available' | 'downloading' | 'downloaded' | 'error',
      localPath: row.local_path,
      description: row.description,
      minRamMB: row.min_ram_mb,
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
    }));
  }

  async getActiveModel(): Promise<ModelInfo | null> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getFirstAsync<any>(
      "SELECT * FROM models WHERE is_active = 1"
    );
    
    if (!result) return null;

    return {
      id: result.id,
      name: result.name,
      fileName: result.file_name,
      url: result.url,
      sizeBytes: result.size_bytes,
      quantization: result.quantization,
      contextLength: result.context_length,
      isActive: Boolean(result.is_active),
      source: result.source as 'default' | 'url' | 'file',
      status: result.status as 'available' | 'downloading' | 'downloaded' | 'error',
      localPath: result.local_path,
      description: result.description,
      minRamMB: result.min_ram_mb,
      createdAt: result.created_at ? new Date(result.created_at) : undefined,
    };
  }

  async setActiveModel(modelId: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      // First, deactivate all models
      await this.db.runAsync("UPDATE models SET is_active = 0");
      
      // Then activate the specified model
      await this.db.runAsync(
        "UPDATE models SET is_active = 1 WHERE id = ?",
        modelId
      );
      
      loggingService.info("Database", "Active model updated", { modelId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      loggingService.error("Database", "Failed to set active model", { error: errorMessage, modelId });
      throw error;
    }
  }

  async updateModelStatus(modelId: string, status: 'available' | 'downloading' | 'downloaded' | 'error', localPath?: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      if (localPath) {
        await this.db.runAsync(
          "UPDATE models SET status = ?, local_path = ? WHERE id = ?",
          status,
          localPath,
          modelId
        );
      } else {
        await this.db.runAsync(
          "UPDATE models SET status = ? WHERE id = ?",
          status,
          modelId
        );
      }
      loggingService.debug("Database", "Model status updated", { modelId, status });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      loggingService.error("Database", "Failed to update model status", { error: errorMessage, modelId });
      throw error;
    }
  }

  async deleteModel(modelId: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      await this.db.runAsync(
        "DELETE FROM models WHERE id = ?",
        modelId
      );
      loggingService.info("Database", "Model deleted from registry", { modelId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      loggingService.error("Database", "Failed to delete model", { error: errorMessage, modelId });
      throw error;
    }
  }

  async getModel(modelId: string): Promise<ModelInfo | null> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getFirstAsync<any>(
      "SELECT * FROM models WHERE id = ?",
      modelId
    );
    
    if (!result) return null;

    return {
      id: result.id,
      name: result.name,
      fileName: result.file_name,
      url: result.url,
      sizeBytes: result.size_bytes,
      quantization: result.quantization,
      contextLength: result.context_length,
      isActive: Boolean(result.is_active),
      source: result.source as 'default' | 'url' | 'file',
      status: result.status as 'available' | 'downloading' | 'downloaded' | 'error',
      localPath: result.local_path,
      description: result.description,
      minRamMB: result.min_ram_mb,
      createdAt: result.created_at ? new Date(result.created_at) : undefined,
    };
  }
}

export const databaseService = new DatabaseService();
