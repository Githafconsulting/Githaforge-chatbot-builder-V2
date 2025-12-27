import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import { SuperAdminAuthProvider } from './contexts/SuperAdminAuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { SuperAdminProtectedRoute } from './components/layout/SuperAdminProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { SuperAdminLayout } from './components/layout/SuperAdminLayout';
import { HomeNew } from './pages/HomeNew';
import { Features } from './pages/Features';
import { Pricing } from './pages/Pricing';
import { FAQs } from './pages/FAQs';
import { Contact } from './pages/Contact';
import { About } from './pages/About';
import { Blogs } from './pages/Blogs';
import { Reviews } from './pages/Reviews';
import { BlogPost } from './pages/BlogPost';
import { Signup } from './pages/Signup';
import { Onboarding } from './pages/Onboarding';
import { Login } from './pages/Login';
import { SuperAdminLogin } from './pages/SuperAdminLogin';
import { Companies } from './pages/superAdmin/Companies';
import { PlatformChatbot } from './pages/superAdmin/PlatformChatbot';
import { ChatbotConfiguration } from './pages/superAdmin/ChatbotConfiguration';
import { SystemPersonas } from './pages/superAdmin/SystemPersonas';
import { BlogManagement } from './pages/superAdmin/BlogManagement';
import { FAQManagement } from './pages/superAdmin/FAQManagement';
import { AnalyticsPage } from './pages/admin/Analytics';
import { ChatbotsUnifiedPage } from './pages/admin/ChatbotsUnified';
import { ChatbotDetailPage } from './pages/admin/ChatbotDetail';
import { DocumentsPage } from './pages/admin/Documents';
import { ConversationsPage } from './pages/admin/Conversations';
import { FlaggedPage } from './pages/admin/Flagged';
import { UsersPage } from './pages/admin/Users';
import { TeamPage } from './pages/admin/Team';
import { CompanySettingsPage } from './pages/admin/CompanySettings';
import { SystemSettingsPage } from './pages/admin/SystemSettings';
import { DeletedItemsPage } from './pages/admin/DeletedItems';
import { LearningPage } from './pages/admin/Learning';
import { IntegrationsPage } from './pages/admin/Integrations';
import { EmbedPage } from './pages/Embed';
import { ChatbotTestPage } from './pages/admin/ChatbotTest';
import { GlowComponentsShowcase } from './pages/GlowComponentsShowcase';
import { OAuthCallback } from './pages/OAuthCallback';
import './i18n'; // Initialize i18n

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <SuperAdminAuthProvider>
              <BrowserRouter>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<HomeNew />} />
                  <Route path="/features" element={<Features />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/faqs" element={<FAQs />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/blogs" element={<Blogs />} />
                  <Route path="/reviews" element={<Reviews />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/super-admin-login" element={<SuperAdminLogin />} />
                  <Route path="/embed" element={<EmbedPage />} />
                  <Route path="/chatbot-test" element={<ChatbotTestPage />} />
                  <Route path="/oauth/callback" element={<OAuthCallback />} />

          {/* Glow Components Demo Pages */}
          <Route path="/glow-showcase" element={<GlowComponentsShowcase />} />

          {/* Onboarding (semi-protected - requires signup) */}
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AnalyticsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="chatbots" element={<ChatbotsUnifiedPage />} />
            <Route path="chatbots/:chatbotId" element={<ChatbotDetailPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="conversations" element={<ConversationsPage />} />
            <Route path="flagged" element={<FlaggedPage />} />
            <Route path="learning" element={<LearningPage />} />
            <Route path="deleted" element={<DeletedItemsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="company" element={<CompanySettingsPage />} />
            <Route path="billing" element={<div className="text-white p-8">Billing & Plans - Coming Soon</div>} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="settings" element={<SystemSettingsPage />} />
            {/* Redirects for old routes */}
            <Route path="chatbot" element={<Navigate to="/admin/chatbots" replace />} />
            <Route path="personas" element={<Navigate to="/admin/chatbots" replace />} />
          </Route>

          {/* Super Admin Routes */}
          <Route
            path="/super-admin"
            element={
              <SuperAdminProtectedRoute>
                <SuperAdminLayout />
              </SuperAdminProtectedRoute>
            }
          >
            <Route index element={<div className="text-white p-8">Platform Analytics Coming Soon</div>} />
            <Route path="companies" element={<Companies />} />
            <Route path="system-personas" element={<SystemPersonas />} />
            <Route path="platform-chatbot" element={<PlatformChatbot />} />
            <Route path="chatbot-config" element={<ChatbotConfiguration />} />
            <Route path="blogs" element={<BlogManagement />} />
            <Route path="faqs" element={<FAQManagement />} />
            <Route path="users" element={<div className="text-white p-8">All Users Coming Soon</div>} />
            <Route path="billing" element={<div className="text-white p-8">Billing & Plans Coming Soon</div>} />
            <Route path="logs" element={<div className="text-white p-8">System Logs Coming Soon</div>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </SuperAdminAuthProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
