// Type definitions for the application

export interface User {
  id: string; // A-number
  requestCount: number;
  maxRequests: number;
  createdAt: string;
  lastActive: string;
}

export interface Interaction {
  id: string;
  userId: string;
  sessionId: string;
  type: 'prompt-response';
  prompt: string;
  response: string;
  model: string;
  timestamp: string;
  conversationHistory: ConversationMessage[];
  metadata: {
    responseTime: number;
    tokenCount?: number;
  };
}

export interface Event {
  id: string;
  userId: string;
  sessionId: string;
  eventType: 'typing' | 'paste' | 'responseView' | 'promptSubmit' | 'contextReset';
  timestamp: string;
  data: Record<string, any>;
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DatabaseAdapter {
  // User operations
  getUser(userId: string): Promise<User | null>;
  createUser(userId: string): Promise<User>;
  updateUser(userId: string, updates: Partial<User>): Promise<void>;
  incrementRequestCount(userId: string): Promise<number>;
  
  // Interaction operations
  createInteraction(interaction: Omit<Interaction, 'id'>): Promise<string>;
  
  // Event operations
  createEvent(event: Omit<Event, 'id'>): Promise<string>;
  
  // Cleanup
  close(): Promise<void>;
}
