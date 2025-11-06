import axios from 'axios';
import type { AxiosInstance } from 'axios';

/**
 * Standalone API client for embedded widget
 * Configurable backend URL for external websites
 */

export interface ChatResponse {
  response: string;
  sources?: Array<{
    id: string;
    content: string;
    similarity: number;
  }>;
  context_found: boolean;
  session_id: string;
  message_id: string;
}

export interface Feedback {
  message_id: string;
  rating: number;
  comment?: string;
}

export class WidgetApiClient {
  private api: AxiosInstance;

  constructor(backendUrl: string) {
    this.api = axios.create({
      baseURL: backendUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    // Error interceptor
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('[Githaf Widget] API Error:', error);
        return Promise.reject(error);
      }
    );
  }

  async sendMessage(message: string, sessionId: string): Promise<ChatResponse> {
    try {
      const response = await this.api.post('/api/v1/chat/', {
        message,
        session_id: sessionId,
      });
      return response.data;
    } catch (error) {
      console.error('[Githaf Widget] Failed to send message:', error);
      throw error;
    }
  }

  async submitFeedback(feedback: Feedback): Promise<void> {
    try {
      await this.api.post('/api/v1/feedback/', feedback);
    } catch (error) {
      console.error('[Githaf Widget] Failed to submit feedback:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: string }> {
    try {
      const response = await this.api.get('/health');
      return response.data;
    } catch (error) {
      console.error('[Githaf Widget] Health check failed:', error);
      throw error;
    }
  }
}

// Export factory function
export function createWidgetApi(backendUrl: string): WidgetApiClient {
  return new WidgetApiClient(backendUrl);
}

// Global instance that can be configured at runtime
let globalWidgetApi: WidgetApiClient | null = null;

export function configureWidgetApi(backendUrl: string): WidgetApiClient {
  globalWidgetApi = new WidgetApiClient(backendUrl);
  return globalWidgetApi;
}

export function getWidgetApi(): WidgetApiClient {
  if (!globalWidgetApi) {
    throw new Error('Widget API not configured. Call configureWidgetApi() first.');
  }
  return globalWidgetApi;
}

export function isWidgetApiConfigured(): boolean {
  return globalWidgetApi !== null;
}
