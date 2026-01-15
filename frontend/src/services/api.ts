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
  Persona,
  PersonaCreate,
  PersonaUpdate,
  PersonaRegenerateRequest,
  Blog,
  BlogCreate,
  BlogUpdate,
  BlogListResponse,
  BlogCategory,
  BlogCategoryCreate,
  BlogCategoryUpdate,
  BlogStatus,
  FAQ,
  FAQCreate,
  FAQUpdate,
  FAQListResponse,
  FAQCategory,
  FAQCategoryCreate,
  FAQCategoryUpdate,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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

  async refreshToken(): Promise<AuthResponse> {
    const response = await this.api.post('/api/v1/auth/refresh');

    // Update stored token
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

  async uploadDocument(file: File, category?: string, isShared: boolean = true): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);  // Field name MUST be 'file'
    if (category) {
      formData.append('category', category);
    }
    formData.append('is_shared', String(isShared));

    const response = await this.api.post('/api/v1/documents/upload', formData, {
      headers: {
        // Remove Content-Type to let browser set multipart/form-data with boundary
        'Content-Type': 'multipart/form-data',
      },
    });
    // Backend returns { success: true, document: {...} }
    return response.data.document || response.data;
  }

  async addDocumentFromUrl(url: string, category?: string, isShared: boolean = true): Promise<Document> {
    // URL endpoint expects form-urlencoded, NOT JSON
    const formData = new URLSearchParams();
    formData.append('url', url);
    if (category) {
      formData.append('category', category);
    }
    formData.append('is_shared', String(isShared));

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

  async updateDocumentSharing(id: string, isShared: boolean): Promise<Document> {
    const response = await this.api.put(`/api/v1/documents/${id}/sharing`, {
      is_shared: isShared
    });
    return response.data.document || response.data;
  }

  async getDocumentsFiltered(isShared?: boolean): Promise<Document[]> {
    const params: Record<string, any> = {};
    if (isShared !== undefined) {
      params.is_shared = isShared;
    }
    const response = await this.api.get('/api/v1/documents/', { params });
    return response.data.documents || response.data;
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

  async uploadUserAvatar(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.api.post('/api/v1/users/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
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

  async hideChatbot(chatbotId: string): Promise<Chatbot> {
    const response = await this.api.put(`/api/v1/chatbots/${chatbotId}`, {
      is_active: false
    });
    return response.data;
  }

  async showChatbot(chatbotId: string): Promise<Chatbot> {
    const response = await this.api.put(`/api/v1/chatbots/${chatbotId}`, {
      is_active: true
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

  async assignChatbotPersona(chatbotId: string, personaId: string | null): Promise<Chatbot> {
    const response = await this.api.put(`/api/v1/chatbots/${chatbotId}/persona`, {
      persona_id: personaId
    });
    return response.data;
  }

  async setChatbotKBMode(
    chatbotId: string,
    useSharedKB: boolean,
    selectedDocumentIds?: string[]
  ): Promise<Chatbot> {
    const response = await this.api.put(`/api/v1/chatbots/${chatbotId}/kb-mode`, {
      use_shared_kb: useSharedKB,
      selected_document_ids: selectedDocumentIds
    });
    return response.data;
  }

  // Persona APIs (Role-based chatbot prompt configurations)
  async getPersonas(includeChatbotCount: boolean = false): Promise<Persona[]> {
    const response = await this.api.get('/api/v1/personas/', {
      params: { include_chatbot_count: includeChatbotCount }
    });
    return response.data;
  }

  async getPersona(personaId: string): Promise<Persona> {
    const response = await this.api.get(`/api/v1/personas/${personaId}`);
    return response.data;
  }

  async createPersona(data: PersonaCreate): Promise<Persona> {
    const response = await this.api.post('/api/v1/personas/', data);
    return response.data;
  }

  async updatePersona(personaId: string, data: PersonaUpdate): Promise<Persona> {
    const response = await this.api.put(`/api/v1/personas/${personaId}`, data);
    return response.data;
  }

  async deletePersona(personaId: string): Promise<void> {
    await this.api.delete(`/api/v1/personas/${personaId}`);
  }

  async regeneratePersonaPrompt(personaId: string, request: PersonaRegenerateRequest): Promise<Persona> {
    const response = await this.api.post(`/api/v1/personas/${personaId}/regenerate`, request);
    return response.data;
  }

  async restorePersonaToDefault(personaId: string): Promise<Persona> {
    const response = await this.api.post(`/api/v1/personas/${personaId}/restore-default`);
    return response.data;
  }

  async restorePersonaToLastSaved(personaId: string): Promise<Persona> {
    const response = await this.api.post(`/api/v1/personas/${personaId}/restore-last-saved`);
    return response.data;
  }

  async seedDefaultPersonas(): Promise<Persona[]> {
    const response = await this.api.post('/api/v1/personas/seed-defaults');
    return response.data;
  }

  async clonePersona(personaId: string, newName?: string): Promise<Persona> {
    const response = await this.api.post(`/api/v1/personas/${personaId}/clone`,
      newName ? { new_name: newName } : {}
    );
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

  async uploadCompanyFavicon(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.api.post('/api/v1/companies/upload-favicon', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteCompany(companyId: string): Promise<void> {
    await this.api.delete(`/api/v1/companies/${companyId}`);
  }

  // Super Admin - System Personas APIs
  async getSystemPersonas(): Promise<Persona[]> {
    const response = await this.api.get('/api/v1/super-admin/system-personas');
    return response.data;
  }

  async getSystemPersona(personaId: string): Promise<Persona> {
    const response = await this.api.get(`/api/v1/super-admin/system-personas/${personaId}`);
    return response.data;
  }

  async createSystemPersona(data: { name: string; description: string; system_prompt: string }): Promise<Persona> {
    const response = await this.api.post('/api/v1/super-admin/system-personas', data);
    return response.data;
  }

  async updateSystemPersona(personaId: string, data: { name?: string; description?: string; system_prompt?: string }): Promise<Persona> {
    const response = await this.api.put(`/api/v1/super-admin/system-personas/${personaId}`, data);
    return response.data;
  }

  async deleteSystemPersona(personaId: string): Promise<void> {
    await this.api.delete(`/api/v1/super-admin/system-personas/${personaId}`);
  }

  async getSystemPersonaUsage(personaId: string): Promise<{ persona_id: string; persona_name: string; total_chatbots: number; chatbots: any[] }> {
    const response = await this.api.get(`/api/v1/super-admin/system-personas/${personaId}/usage`);
    return response.data;
  }

  // ==================== BLOG APIs (Public) ====================

  async getPublicBlogs(params?: {
    page?: number;
    page_size?: number;
    category?: string;
    tag?: string;
    featured?: boolean;
    search?: string;
  }): Promise<BlogListResponse> {
    const response = await this.api.get('/api/v1/blogs/', { params });
    return response.data;
  }

  async getFeaturedBlogs(limit?: number): Promise<Blog[]> {
    const response = await this.api.get('/api/v1/blogs/featured', { params: { limit } });
    return response.data;
  }

  async getRecentBlogs(limit?: number, excludeFeatured?: boolean): Promise<Blog[]> {
    const response = await this.api.get('/api/v1/blogs/recent', {
      params: { limit, exclude_featured: excludeFeatured }
    });
    return response.data;
  }

  async getBlogCategories(): Promise<BlogCategory[]> {
    const response = await this.api.get('/api/v1/blogs/categories');
    return response.data;
  }

  async getBlogTags(): Promise<string[]> {
    const response = await this.api.get('/api/v1/blogs/tags');
    return response.data;
  }

  async getBlogBySlug(slug: string): Promise<Blog> {
    const response = await this.api.get(`/api/v1/blogs/slug/${slug}`);
    return response.data;
  }

  async getRelatedBlogs(blogId: string, limit?: number): Promise<Blog[]> {
    const response = await this.api.get(`/api/v1/blogs/${blogId}/related`, { params: { limit } });
    return response.data;
  }

  // ==================== BLOG APIs (Admin) ====================

  async getAdminBlogs(params?: {
    page?: number;
    page_size?: number;
    status?: BlogStatus;
    category?: string;
    search?: string;
  }): Promise<BlogListResponse> {
    const response = await this.api.get('/api/v1/blogs/admin/all', { params });
    return response.data;
  }

  async getAdminBlog(blogId: string): Promise<Blog> {
    const response = await this.api.get(`/api/v1/blogs/admin/${blogId}`);
    return response.data;
  }

  async createBlog(blog: BlogCreate): Promise<Blog> {
    const response = await this.api.post('/api/v1/blogs/admin', blog);
    return response.data;
  }

  async updateBlog(blogId: string, blog: BlogUpdate): Promise<Blog> {
    const response = await this.api.put(`/api/v1/blogs/admin/${blogId}`, blog);
    return response.data;
  }

  async publishBlog(blogId: string, publish: boolean = true): Promise<Blog> {
    const response = await this.api.post(`/api/v1/blogs/admin/${blogId}/publish`, { publish });
    return response.data;
  }

  async deleteBlog(blogId: string): Promise<void> {
    await this.api.delete(`/api/v1/blogs/admin/${blogId}`);
  }

  async createBlogCategory(category: BlogCategoryCreate): Promise<BlogCategory> {
    const response = await this.api.post('/api/v1/blogs/admin/categories', category);
    return response.data;
  }

  async updateBlogCategory(categoryId: string, category: BlogCategoryUpdate): Promise<BlogCategory> {
    const response = await this.api.put(`/api/v1/blogs/admin/categories/${categoryId}`, category);
    return response.data;
  }

  async deleteBlogCategory(categoryId: string): Promise<void> {
    await this.api.delete(`/api/v1/blogs/admin/categories/${categoryId}`);
  }

  async uploadBlogImage(file: File): Promise<{ success: boolean; url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.api.post('/api/v1/blogs/admin/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async deleteBlogImage(filename: string): Promise<void> {
    await this.api.delete(`/api/v1/blogs/admin/delete-image/${filename}`);
  }

  // ==================== FAQ APIs (Public) ====================

  async getPublicFAQs(category?: string): Promise<FAQ[]> {
    const response = await this.api.get('/api/v1/faqs/', { params: category ? { category } : {} });
    return response.data;
  }

  async getFeaturedFAQs(limit?: number): Promise<FAQ[]> {
    const response = await this.api.get('/api/v1/faqs/featured', { params: { limit } });
    return response.data;
  }

  async getFAQCategories(): Promise<FAQCategory[]> {
    const response = await this.api.get('/api/v1/faqs/categories');
    return response.data;
  }

  async submitFAQFeedback(faqId: string, helpful: boolean): Promise<void> {
    await this.api.post(`/api/v1/faqs/${faqId}/feedback`, { helpful });
  }

  async recordFAQView(faqId: string): Promise<void> {
    await this.api.post(`/api/v1/faqs/${faqId}/view`);
  }

  // ==================== FAQ APIs (Admin) ====================

  async getAdminFAQs(params?: {
    page?: number;
    page_size?: number;
    category_id?: string;
    is_active?: boolean;
    is_featured?: boolean;
    search?: string;
  }): Promise<FAQListResponse> {
    const response = await this.api.get('/api/v1/faqs/admin/all', { params });
    return response.data;
  }

  async getAdminFAQCategories(): Promise<FAQCategory[]> {
    const response = await this.api.get('/api/v1/faqs/admin/categories');
    return response.data;
  }

  async getAdminFAQ(faqId: string): Promise<FAQ> {
    const response = await this.api.get(`/api/v1/faqs/admin/${faqId}`);
    return response.data;
  }

  async createFAQ(faq: FAQCreate): Promise<FAQ> {
    const response = await this.api.post('/api/v1/faqs/admin', faq);
    return response.data;
  }

  async updateFAQ(faqId: string, faq: FAQUpdate): Promise<FAQ> {
    const response = await this.api.put(`/api/v1/faqs/admin/${faqId}`, faq);
    return response.data;
  }

  async deleteFAQ(faqId: string): Promise<void> {
    await this.api.delete(`/api/v1/faqs/admin/${faqId}`);
  }

  async reorderFAQs(orders: Array<{ id: string; order: number }>): Promise<void> {
    await this.api.post('/api/v1/faqs/admin/reorder', orders);
  }

  async createFAQCategory(category: FAQCategoryCreate): Promise<FAQCategory> {
    const response = await this.api.post('/api/v1/faqs/admin/categories', category);
    return response.data;
  }

  async updateFAQCategory(categoryId: string, category: FAQCategoryUpdate): Promise<FAQCategory> {
    const response = await this.api.put(`/api/v1/faqs/admin/categories/${categoryId}`, category);
    return response.data;
  }

  async deleteFAQCategory(categoryId: string): Promise<void> {
    await this.api.delete(`/api/v1/faqs/admin/categories/${categoryId}`);
  }

  async reorderFAQCategories(orders: Array<{ id: string; order: number }>): Promise<void> {
    await this.api.post('/api/v1/faqs/admin/categories/reorder', orders);
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

  // ==================== BILLING APIs ====================

  // Get Stripe publishable key for frontend
  async getBillingConfig(): Promise<{ publishable_key: string }> {
    const response = await this.api.get('/api/v1/billing/config');
    return response.data;
  }

  // Get billing info for current company
  async getBillingInfo(): Promise<{
    company_id: string;
    current_plan: string;
    subscription_status: string;
    billing_email: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    trial_ends_at: string | null;
    has_payment_method: boolean;
  }> {
    const response = await this.api.get('/api/v1/billing/info');
    return response.data;
  }

  // Get subscription details
  async getSubscription(): Promise<{
    plan: string;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    trial_ends_at: string | null;
  }> {
    const response = await this.api.get('/api/v1/billing/subscription');
    return response.data;
  }

  // Get usage stats
  async getBillingUsage(): Promise<{
    chatbots_used: number;
    chatbots_limit: number;
    documents_used: number;
    documents_limit: number;
    messages_used: number;
    messages_limit: number;
    team_members_used: number;
    team_members_limit: number;
  }> {
    const response = await this.api.get('/api/v1/billing/usage');
    return response.data;
  }

  // Get invoices
  async getInvoices(): Promise<Array<{
    id: string;
    stripe_invoice_id: string;
    amount_due: number;
    amount_paid: number;
    currency: string;
    status: string;
    invoice_date: string | null;
    due_date: string | null;
    paid_at: string | null;
    invoice_pdf_url: string | null;
    hosted_invoice_url: string | null;
  }>> {
    const response = await this.api.get('/api/v1/billing/invoices');
    return response.data;
  }

  // Get payment methods
  async getPaymentMethods(): Promise<Array<{
    id: string;
    stripe_payment_method_id: string;
    card_brand: string | null;
    card_last4: string | null;
    card_exp_month: number | null;
    card_exp_year: number | null;
    is_default: boolean;
  }>> {
    const response = await this.api.get('/api/v1/billing/payment-methods');
    return response.data;
  }

  // Create checkout session for upgrading to a plan
  async createCheckoutSession(plan: 'starter' | 'pro' | 'enterprise'): Promise<{
    checkout_url: string;
    session_id: string;
  }> {
    const response = await this.api.post('/api/v1/billing/checkout', { plan });
    return response.data;
  }

  // Create customer portal session for managing billing
  async createPortalSession(): Promise<{
    portal_url: string;
  }> {
    const response = await this.api.post('/api/v1/billing/portal');
    return response.data;
  }

  // Cancel subscription
  async cancelSubscription(immediately?: boolean, feedback?: string): Promise<{
    success: boolean;
    message: string;
    cancel_at: string | null;
    refund_amount: number | null;
  }> {
    const response = await this.api.post('/api/v1/billing/cancel', {
      cancel_immediately: immediately,
      feedback
    });
    return response.data;
  }

  // Cancel a scheduled downgrade (keeps current plan)
  async cancelScheduledDowngrade(): Promise<{
    success: boolean;
    message: string;
    current_plan: string;
  }> {
    const response = await this.api.post('/api/v1/billing/cancel-scheduled-downgrade');
    return response.data;
  }

  // Update existing subscription (upgrade/downgrade with proration)
  async updateSubscription(newPlan: 'starter' | 'pro' | 'enterprise'): Promise<{
    success: boolean;
    message: string;
    new_plan: string;
    effective_date: string;
    proration_amount: number | null;
  }> {
    const response = await this.api.post('/api/v1/billing/upgrade', {
      new_plan: newPlan,
      prorate: true
    });
    return response.data;
  }

  // Get proration preview from Stripe for plan changes
  async getProrationPreview(newPlan: 'starter' | 'pro' | 'enterprise'): Promise<{
    current_plan: string;
    new_plan: string;
    is_downgrade: boolean;
    proration_credit: number;  // in cents
    proration_charge: number;  // in cents
    net_amount: number;        // in cents (negative = credit)
    currency: string;
    immediate_charge: number;  // in cents
    credit_dollars: number;
    charge_dollars: number;
    net_dollars: number;
    period_end: number;
  }> {
    const response = await this.api.get(`/api/v1/billing/proration-preview?new_plan=${newPlan}`);
    return response.data;
  }

  // Get account credit balance from Stripe
  async getAccountCredit(): Promise<{
    credit_balance: number;       // in cents
    credit_balance_dollars: number; // in dollars
    currency: string;
    has_credit: boolean;
    error?: string;
  }> {
    const response = await this.api.get('/api/v1/billing/credit');
    return response.data;
  }
}

export const apiService = new ApiService();
