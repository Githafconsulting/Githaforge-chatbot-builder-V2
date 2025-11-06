/**
 * Widget-specific API Service
 * This file replaces api.ts during widget build using Vite alias
 * It provides the same interface but uses the configured widget API client
 */

import { getWidgetApi, isWidgetApiConfigured } from '../widget-api';
import type { ChatResponse, Feedback } from '../types';

class WidgetApiService {
  async sendMessage(message: string, sessionId: string): Promise<ChatResponse> {
    if (!isWidgetApiConfigured()) {
      throw new Error('[Githaf Widget] API not configured');
    }
    return getWidgetApi().sendMessage(message, sessionId);
  }

  async submitFeedback(feedback: Feedback): Promise<void> {
    if (!isWidgetApiConfigured()) {
      throw new Error('[Githaf Widget] API not configured');
    }
    return getWidgetApi().submitFeedback(feedback);
  }

  // Other methods not used by ChatWidget but required for type compatibility
  async login(): Promise<any> {
    throw new Error('Login not available in widget mode');
  }

  async getDocuments(): Promise<any[]> {
    throw new Error('Admin functions not available in widget mode');
  }

  async getDocument(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async uploadDocument(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async addDocumentFromUrl(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async getDocumentContent(): Promise<string> {
    throw new Error('Admin functions not available in widget mode');
  }

  async updateDocument(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async deleteDocument(): Promise<void> {
    throw new Error('Admin functions not available in widget mode');
  }

  async getConversations(): Promise<any[]> {
    throw new Error('Admin functions not available in widget mode');
  }

  async getConversation(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async getAnalytics(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async getFlaggedQueries(): Promise<any[]> {
    throw new Error('Admin functions not available in widget mode');
  }

  async healthCheck(): Promise<any> {
    if (!isWidgetApiConfigured()) {
      throw new Error('[Githaf Widget] API not configured');
    }
    return getWidgetApi().healthCheck();
  }

  async getUsers(): Promise<any[]> {
    throw new Error('Admin functions not available in widget mode');
  }

  async createUser(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async deleteUser(): Promise<void> {
    throw new Error('Admin functions not available in widget mode');
  }

  async getDailyStats(): Promise<any[]> {
    throw new Error('Admin functions not available in widget mode');
  }

  async getCountryStats(): Promise<any[]> {
    throw new Error('Admin functions not available in widget mode');
  }

  async getSystemSettings(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async updateSystemSettings(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async getFeedbackInsights(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async generateDraft(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async getPendingDrafts(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async approveDraft(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async rejectDraft(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async updateDraft(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async deleteDraft(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async triggerLearningJob(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async softDeleteConversation(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async softDeleteMessage(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async softDeleteFeedback(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async softDeleteDraft(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async recoverConversation(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async recoverMessage(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async recoverFeedback(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async recoverDraft(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async permanentDeleteConversation(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async permanentDeleteMessage(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async permanentDeleteFeedback(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async permanentDeleteDraft(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async updateConversation(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async updateMessage(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async updateFeedback(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async getDeletedItems(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }

  async triggerCleanup(): Promise<any> {
    throw new Error('Admin functions not available in widget mode');
  }
}

export const apiService = new WidgetApiService();
