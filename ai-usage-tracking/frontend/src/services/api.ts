import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface CheckUserResponse {
  authorized: boolean;
  requestCount: number;
  maxCap: number;
}

export interface SubmitResponse {
  response: string;
  newRequestCount: number;
  maxCap: number;
  tokenCount?: number;
}

export interface LogEventData {
  userID: string;
  sessionId: string;
  eventType: 'typing' | 'paste' | 'responseView' | 'promptSubmit' | 'contextReset';
  data: Record<string, any>;
}

class APIService {
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async checkUser(userID: string): Promise<CheckUserResponse> {
    const response = await axios.post(`${API_BASE_URL}/api/check-user`, { userID });
    return response.data;
  }

  async submitPrompt(userID: string, prompt: string): Promise<SubmitResponse> {
    const response = await axios.post(`${API_BASE_URL}/api/submit`, {
      userID,
      prompt,
      sessionId: this.sessionId
    });
    return response.data;
  }

  async resetContext(userID: string): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/reset`, {
      userID,
      sessionId: this.sessionId
    });
  }

  async logEvent(eventData: LogEventData): Promise<void> {
    try {
      await axios.post(`${API_BASE_URL}/api/log-event`, {
        ...eventData,
        sessionId: this.sessionId
      });
    } catch (error) {
      console.error('Failed to log event:', error);
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

export const apiService = new APIService();
