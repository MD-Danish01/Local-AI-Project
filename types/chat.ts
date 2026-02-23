export interface Message {
  id?: number;
  conversationId: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** Extracted thinking/reasoning content (for assistant messages with <think> tags) */
  thinking?: string;
  createdAt?: Date;
}

export interface Conversation {
  id?: number;
  title: string;
  createdAt?: Date;
  updatedAt?: Date;
}
