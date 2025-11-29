import axios from 'axios';
import { showErrorToast } from '../utils/errorHandler';
import type {
  ChatResponse,
  Conversation,
  Document,
  Analytics,
  FlaggedQuery,
  LoginCredentials,
  AuthResponse,
  Feedback,
  DailyStats,
  CountryStats,
  SystemSettings,
  FeedbackInsights,
  GenerateDraftRequest,
  GenerateDraftResponse,
  PendingDraftsResponse,
  DraftDocumentReview,
  DeletedItemsResponse,
  SoftDeleteResponse,
  RecoverResponse,
  PermanentDeleteResponse,
  UpdateConversationRequest,
  UpdateMessageRequest,
  UpdateFeedbackRequest,
  ChatbotConfig,
  ChatbotConfigUpdate,
  Chatbot,
  ChatbotCreate,
  ChatbotUpdate,
  ChatbotStats,
  ChatbotWithEmbedCode,
  UnifiedSignupRequest,
  SignupResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiService {
  private api: ReturnType<typeof axios.create>;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Log errors for debugging (except 401)
        if (error.response?.status !== 401) {
          console.error('API Error:', error);
          console.error('API Error Response:', error.response);
        }

        // Handle 401 Unauthorized - Token expired
        if (error.response?.status === 401) {
          const tokenExists = !!localStorage.getItem('access_token');
          const onLoginPage = window.location.pathname.includes('/login');

          if (tokenExists && !onLoginPage) {
            console.warn('401 Unauthorized - Token expired or invalid, logging out...');
            localStorage.removeItem('access_token');
            window.dispatchEvent(new CustomEvent('auth:logout'));
            window.location.href = '/login';
          }
        }

        // Show toast notification for all errors except 401 (handled above)
        // and except silent errors (those with skipToast flag)
        if (error.response?.status !== 401 && !error.config?.skipToast) {
          showErrorToast(error);
        }

        return Promise.reject(error);
      }
    );
  }

  // Public APIs
  async sendMessage(message: string, sessionId: string, chatbotId?: string): Promise<ChatResponse> {
    const response = await this.api.post('/api/v1/chat/', {
      message,
      session_id: sessionId,
      chatbot_id: chatbotId,
    });
    return response.data;
  }

  async endConversation(sessionId: string): Promise<void> {
    await this.api.post('/api/v1/conversations/end', {
      session_id: sessionId,
    });
  }

  async submitFeedback(feedback: Feedback): Promise<void> {
    await this.api.post('/api/v1/feedback/', feedback);
  }

  // Auth APIs
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // OAuth2 Password Flow expects x-www-form-urlencoded, NOT JSON
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await this.api.post('/api/v1/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Clear any super admin tokens to prevent conflicts
    localStorage.removeItem('super_admin_token');
    localStorage.removeItem('is_super_admin');

    // Store token with correct key
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
    }

    return response.data;
  }

  async superAdminLogin(email: string, password: string): Promise<AuthResponse> {
    // OAuth2 Password Flow for super admin
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await this.api.post('/api/v1/auth/super-admin-login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Note: Token is stored in the component after successful login
    // as super_admin_token (separate from regular user token)
    return response.data;
  }

  async signup(data: UnifiedSignupRequest): Promise<SignupResponse> {
    // Unified signup supporting both individual and company accounts
    const response = await this.api.post('/api/v1/auth/unified-signup', data);

    // Store token for immediate login after signup
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
    }

    return response.data;
  }

  // Document APIs
  async getDocuments(): Promise<Document[]> {
    const response = await this.api.get('/api/v1/documents/');
    // Backend returns { documents: [...], total: N }
    return response.data.documents || response.data;
  }

  async getDocument(id: string): Promise<Document> {
    const response = await this.api.get(`/api/v1/documents/${id}`);
    return response.data;
  }

  async uploadDocument(file: File, category?: string): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);  // Field name MUST be 'file'
    if (category) {
      formData.append('category', category);
    }

    const response = await this.api.post('/api/v1/documents/upload', formData, {
      headers: {
        // Remove Content-Type to let browser set multipart/form-data with boundary
        'Content-Type': 'multipart/form-data',
      },
    });
    // Backend returns { success: true, document: {...} }
    return response.data.document || response.data;
  }

  async addDocumentFromUrl(url: string, category?: string): Promise<Document> {
    // URL endpoint expects form-urlencoded, NOT JSON
    const formData = new URLSearchParams();
    formData.append('url', url);
    if (category) {
      formData.append('category', category);
    }

    const response = await this.api.post('/api/v1/documents/url', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    // Backend returns { success: true, document: {...} }
    return response.data.document || response.data;
  }

  async getDocumentContent(id: string): Promise<string> {
    const response = await this.api.get(`/api/v1/documents/${id}/content`);
    return response.data.content;
  }

  async updateDocument(id: string, updates: {
    title?: string;
    content?: string;
    category?: string;
  }): Promise<Document> {
    const response = await this.api.put(`/api/v1/documents/${id}`, updates);
    return response.data.document || response.data;
  }

  async deleteDocument(id: string): Promise<void> {
    await this.api.delete(`/api/v1/documents/${id}`);
  }

  async downloadDocument(id: string): Promise<void> {
    // Call download endpoint and trigger browser download
    const response = await this.api.get(`/api/v1/documents/${id}/download`, {
      responseType: 'blob', // Important for file downloads
    });

    // Create blob URL and trigger download
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'document.txt';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Conversation APIs
  async getConversations(): Promise<Conversation[]> {
    const response = await this.api.get('/api/v1/conversations/');
    // Backend returns { conversations: [...], total: N }
    return response.data.conversations || response.data;
  }

  async getConversation(id: string): Promise<any> {
    const response = await this.api.get(`/api/v1/conversations/${id}`);
    return response.data;
  }

  // Analytics APIs
  async getAnalytics(): Promise<Analytics> {
    const response = await this.api.get('/api/v1/analytics/');
    return response.data;
  }

  async getFlaggedQueries(params?: {
    rating?: number; // 0 = thumbs down, 1 = thumbs up
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<FlaggedQuery[]> {
    const response = await this.api.get('/api/v1/analytics/flagged', {
      params: params || {},
    });
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<any> {
    const response = await this.api.get('/health');
    return response.data;
  }

  // User Management APIs
  async getUsers(): Promise<any[]> {
    const response = await this.api.get('/api/v1/users/');
    return response.data;
  }

  async getCurrentUser(): Promise<any> {
    const response = await this.api.get('/api/v1/users/me');
    return response.data;
  }

  async createUser(userData: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    role_id?: string;
    is_admin?: boolean;
  }): Promise<any> {
    const response = await this.api.post('/api/v1/users/', userData);
    return response.data;
  }

  async updateUser(userId: string, userData: {
    first_name?: string;
    last_name?: string;
    role?: string;
    is_active?: boolean;
  }): Promise<any> {
    const response = await this.api.patch(`/api/v1/users/${userId}`, userData);
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.api.delete(`/api/v1/users/${userId}`);
  }

  // New Analytics APIs
  async getDailyStats(startDate: string, endDate: string): Promise<DailyStats[]> {
    const response = await this.api.get('/api/v1/analytics/daily', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data.daily_stats || response.data;
  }

  async getCountryStats(startDate?: string, endDate?: string): Promise<CountryStats[]> {
    const response = await this.api.get('/api/v1/analytics/countries', {
      params: startDate && endDate ? { start_date: startDate, end_date: endDate } : {},
    });
    return response.data.country_stats || response.data;
  }

  // System Settings APIs
  async getSystemSettings(): Promise<SystemSettings> {
    const response = await this.api.get('/api/v1/settings/');
    return response.data;
  }

  async updateSystemSettings(settings: SystemSettings): Promise<SystemSettings> {
    const response = await this.api.put('/api/v1/settings/', settings);
    return response.data;
  }

  // Learning System APIs
  async getFeedbackInsights(startDate?: string, endDate?: string): Promise<FeedbackInsights> {
    const response = await this.api.get('/api/v1/learning/insights', {
      params: startDate && endDate ? { start_date: startDate, end_date: endDate } : {},
    });
    return response.data;
  }

  async generateDraft(request: GenerateDraftRequest): Promise<GenerateDraftResponse> {
    const response = await this.api.post('/api/v1/learning/generate-draft', request);
    return response.data;
  }

  async getPendingDrafts(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PendingDraftsResponse> {
    const response = await this.api.get('/api/v1/learning/drafts', {
      params: params || { status: 'pending', limit: 20, offset: 0 },
    });
    return response.data;
  }

  async approveDraft(draftId: string, review: DraftDocumentReview): Promise<any> {
    const response = await this.api.post(`/api/v1/learning/drafts/${draftId}/approve`, review);
    return response.data;
  }

  async rejectDraft(draftId: string, review: DraftDocumentReview): Promise<any> {
    const response = await this.api.post(`/api/v1/learning/drafts/${draftId}/reject`, review);
    return response.data;
  }

  async updateDraft(draftId: string, updates: {
    title?: string;
    content?: string;
    category?: string;
  }): Promise<any> {
    const response = await this.api.put(`/api/v1/learning/drafts/${draftId}`, updates);
    return response.data;
  }

  async deleteDraft(draftId: string): Promise<any> {
    const response = await this.api.delete(`/api/v1/learning/drafts/${draftId}`);
    return response.data;
  }

  async triggerLearningJob(): Promise<any> {
    const response = await this.api.post('/api/v1/learning/trigger-job');
    return response.data;
  }

  // Soft Delete APIs
  // Soft Delete Operations
  async softDeleteConversation(conversationId: string): Promise<SoftDeleteResponse> {
    const response = await this.api.delete(`/api/v1/soft-delete/conversation/${conversationId}`);
    return response.data;
  }

  async softDeleteMessage(messageId: string): Promise<SoftDeleteResponse> {
    const response = await this.api.delete(`/api/v1/soft-delete/message/${messageId}`);
    return response.data;
  }

  async softDeleteFeedback(feedbackId: string): Promise<SoftDeleteResponse> {
    const response = await this.api.delete(`/api/v1/soft-delete/feedback/${feedbackId}`);
    return response.data;
  }

  async softDeleteDraft(draftId: string): Promise<SoftDeleteResponse> {
    const response = await this.api.delete(`/api/v1/soft-delete/draft/${draftId}`);
    return response.data;
  }

  // Recovery Operations
  async recoverConversation(conversationId: string): Promise<RecoverResponse> {
    const response = await this.api.post(`/api/v1/soft-delete/conversation/${conversationId}/recover`);
    return response.data;
  }

  async recoverMessage(messageId: string): Promise<RecoverResponse> {
    const response = await this.api.post(`/api/v1/soft-delete/message/${messageId}/recover`);
    return response.data;
  }

  async recoverFeedback(feedbackId: string): Promise<RecoverResponse> {
    const response = await this.api.post(`/api/v1/soft-delete/feedback/${feedbackId}/recover`);
    return response.data;
  }

  async recoverDraft(draftId: string): Promise<RecoverResponse> {
    const response = await this.api.post(`/api/v1/soft-delete/draft/${draftId}/recover`);
    return response.data;
  }

  // Permanent Delete Operations
  async permanentDeleteConversation(conversationId: string): Promise<PermanentDeleteResponse> {
    const response = await this.api.delete(`/api/v1/soft-delete/conversation/${conversationId}/permanent?confirm=true`);
    return response.data;
  }

  async permanentDeleteMessage(messageId: string): Promise<PermanentDeleteResponse> {
    const response = await this.api.delete(`/api/v1/soft-delete/message/${messageId}/permanent?confirm=true`);
    return response.data;
  }

  async permanentDeleteFeedback(feedbackId: string): Promise<PermanentDeleteResponse> {
    const response = await this.api.delete(`/api/v1/soft-delete/feedback/${feedbackId}/permanent?confirm=true`);
    return response.data;
  }

  async permanentDeleteDraft(draftId: string): Promise<PermanentDeleteResponse> {
    const response = await this.api.delete(`/api/v1/soft-delete/draft/${draftId}/permanent?confirm=true`);
    return response.data;
  }

  // Update Operations
  async updateConversation(conversationId: string, data: UpdateConversationRequest): Promise<any> {
    const response = await this.api.put(`/api/v1/soft-delete/conversation/${conversationId}`, data);
    return response.data;
  }

  async updateMessage(messageId: string, data: UpdateMessageRequest): Promise<any> {
    const response = await this.api.put(`/api/v1/soft-delete/message/${messageId}`, data);
    return response.data;
  }

  async updateFeedback(feedbackId: string, data: UpdateFeedbackRequest): Promise<any> {
    const response = await this.api.put(`/api/v1/soft-delete/feedback/${feedbackId}`, data);
    return response.data;
  }

  // Get Deleted Items
  async getDeletedItems(params?: {
    item_type?: 'conversation' | 'message' | 'feedback';
    limit?: number;
    offset?: number;
  }): Promise<DeletedItemsResponse> {
    const response = await this.api.get('/api/v1/soft-delete/items', {
      params: params || { limit: 100, offset: 0 },
    });
    return response.data;
  }

  // Manual Cleanup
  async triggerCleanup(): Promise<any> {
    const response = await this.api.post('/api/v1/soft-delete/cleanup');
    return response.data;
  }

  // Widget Settings APIs (Public endpoint for get, Protected for update)
  async getWidgetSettings(): Promise<any> {
    const response = await this.api.get('/api/v1/widget/');
    return response.data;
  }

  async updateWidgetSettings(settings: any): Promise<any> {
    const response = await this.api.put('/api/v1/widget/', settings);
    return response.data;
  }

  async resetWidgetSettings(): Promise<any> {
    const response = await this.api.post('/api/v1/widget/reset');
    return response.data;
  }

  // Chatbot Configuration APIs
  async getChatbotConfig(): Promise<ChatbotConfig> {
    const response = await this.api.get('/api/v1/chatbot-config/');
    return response.data;
  }

  async updateChatbotConfig(updates: ChatbotConfigUpdate): Promise<any> {
    const response = await this.api.put('/api/v1/chatbot-config/', updates);
    return response.data;
  }

  async resetChatbotConfig(): Promise<any> {
    const response = await this.api.post('/api/v1/chatbot-config/reset');
    return response.data;
  }

  // Multi-Tenant Chatbot APIs
  async getChatbots(limit: number = 50, offset: number = 0): Promise<{ chatbots: Chatbot[]; total: number }> {
    const response = await this.api.get('/api/v1/chatbots/', { params: { limit, offset } });
    return response.data;
  }

  async getChatbot(chatbotId: string): Promise<Chatbot> {
    const response = await this.api.get(`/api/v1/chatbots/${chatbotId}`);
    return response.data;
  }

  async createChatbot(data: ChatbotCreate): Promise<Chatbot> {
    const response = await this.api.post('/api/v1/chatbots/', data);
    return response.data;
  }

  async updateChatbot(chatbotId: string, data: ChatbotUpdate): Promise<Chatbot> {
    const response = await this.api.put(`/api/v1/chatbots/${chatbotId}`, data);
    return response.data;
  }

  async deleteChatbot(chatbotId: string): Promise<void> {
    await this.api.delete(`/api/v1/chatbots/${chatbotId}`);
  }

  async deployChatbot(chatbotId: string): Promise<Chatbot> {
    const response = await this.api.post(`/api/v1/chatbots/${chatbotId}/deploy`, {
      deploy_status: 'deployed'
    });
    return response.data;
  }

  async pauseChatbot(chatbotId: string): Promise<Chatbot> {
    const response = await this.api.post(`/api/v1/chatbots/${chatbotId}/deploy`, {
      deploy_status: 'paused'
    });
    return response.data;
  }

  async getChatbotStats(chatbotId: string): Promise<ChatbotStats> {
    const response = await this.api.get(`/api/v1/chatbots/${chatbotId}/stats`);
    return response.data;
  }

  async getChatbotWithEmbedCode(chatbotId: string): Promise<ChatbotWithEmbedCode> {
    const response = await this.api.get(`/api/v1/chatbots/${chatbotId}/embed-code`);
    return response.data;
  }

  // Cloud Integration APIs
  async getIntegrations(): Promise<IntegrationConnection[]> {
    const response = await this.api.get('/api/v1/integrations/');
    return response.data;
  }

  async connectGoogleDrive(): Promise<{ authorization_url: string; state: string }> {
    const response = await this.api.get('/api/v1/integrations/google_drive/connect');
    return response.data;
  }

  async disconnectIntegration(platform: IntegrationPlatform): Promise<{ success: boolean; message: string; platform: string }> {
    const response = await this.api.delete(`/api/v1/integrations/${platform}`);
    return response.data;
  }

  async getCloudFiles(platform: IntegrationPlatform, folderId?: string, pageToken?: string): Promise<{ files: CloudFile[]; nextPageToken?: string }> {
    const params: any = {};
    if (folderId) params.folder_id = folderId;
    if (pageToken) params.page_token = pageToken;

    const response = await this.api.get(`/api/v1/integrations/${platform}/files`, { params });
    return response.data;
  }

  async importFromCloud(platform: IntegrationPlatform, request: ImportFilesRequest): Promise<{ success: boolean; message: string; documents: any[] }> {
    const response = await this.api.post(`/api/v1/integrations/${platform}/import`, request);
    return response.data;
  }

  // Company Settings APIs
  async getCompanySettings(): Promise<any> {
    const response = await this.api.get('/api/v1/companies/me');
    return response.data;
  }

  async updateCompanySettings(updates: {
    name?: string;
    website?: string;
    industry?: string;
    company_size?: string;
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    custom_scopes?: string[];
  }): Promise<any> {
    // Get current company ID from settings first
    const currentSettings = await this.getCompanySettings();
    const response = await this.api.put(`/api/v1/companies/${currentSettings.id}`, updates);
    return response.data;
  }

  async uploadCompanyLogo(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.api.post('/api/v1/companies/upload-logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Generic HTTP methods for custom endpoints
  async get<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.api.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.api.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.api.put(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.api.patch(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.api.delete(url, config);
    return response.data;
  }
}

export const apiService = new ApiService();
