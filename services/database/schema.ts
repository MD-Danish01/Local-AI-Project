export const createTablesSQL = `
  -- Conversations table
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT DEFAULT 'New Chat',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Messages table
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    thinking TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  -- Models table
  CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    url TEXT,
    size_bytes INTEGER,
    quantization TEXT DEFAULT 'Q4_0',
    context_length INTEGER DEFAULT 2048,
    is_active INTEGER DEFAULT 0,
    source TEXT CHECK(source IN ('default', 'url', 'file')) DEFAULT 'default',
    status TEXT CHECK(status IN ('available', 'downloading', 'downloaded', 'error')) DEFAULT 'available',
    local_path TEXT,
    description TEXT,
    min_ram_mb INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Indexes for faster queries
  CREATE INDEX IF NOT EXISTS idx_messages_conversation 
  ON messages(conversation_id);
  
  CREATE UNIQUE INDEX IF NOT EXISTS idx_active_model 
  ON models(is_active) WHERE is_active = 1;
`;
