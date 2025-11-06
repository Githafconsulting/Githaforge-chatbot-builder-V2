# Githaf Chatbot System - Complete Implementation Documentation

**Last Updated:** January 10, 2025 (Session 5)
**Project Status:** Development (Frontend + Backend Integrated)
**Version:** 1.2.0

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Features Implemented](#features-implemented)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Data Flow](#data-flow)
9. [Frontend Routes](#frontend-routes)
10. [Configuration](#configuration)
11. [Security](#security)
12. [Recent Changes](#recent-changes)
13. [Known Issues](#known-issues)
14. [TODO/Roadmap](#todoroadmap)
15. [Deployment](#deployment)
16. [Development Workflow](#development-workflow)

---

## Project Overview

A full-stack **RAG-based (Retrieval-Augmented Generation)** customer service chatbot system for Githaf Consulting. Combines a React frontend with a FastAPI backend to deliver AI-powered customer support with an admin dashboard.

### Key Capabilities
- AI-powered chat with context-aware responses
- Knowledge base management (PDF, DOCX, TXT, URL scraping)
- Admin dashboard with analytics
- Multi-language support (EN, FR, DE, ES, AR)
- Dark/light theme switching
- User authentication & authorization
- Real-time conversation tracking

---

## Architecture

### High-Level Architecture
```
┌──────────────────────┐
│  React Frontend      │  (TypeScript + Vite + Tailwind CSS)
│  Port: 5173          │  - Chat Widget
│                      │  - Admin Dashboard (7 pages)
│                      │  - i18n Support (5 languages)
└──────────┬───────────┘
           │
           │ REST API (Axios)
           │ JWT Authentication
           │
┌──────────▼───────────┐
│  FastAPI Backend     │  (Python 3.9+)
│  Port: 8000          │  - RAG Pipeline
│                      │  - Rate Limiting (10 req/min)
│                      │  - CORS Middleware
└──────────┬───────────┘
           │
           ├──► Groq API (Llama 3.1-8b-instant)
           ├──► Sentence Transformers (all-MiniLM-L6-v2, 384-dim)
           └──► Supabase (PostgreSQL + pgvector)
```

### 3-Tier Data Architecture

**Layer 1: Supabase Storage (Original Files)**
- Stores original uploaded files (PDF, DOCX, TXT)
- Provides signed URLs for secure downloads
- Organized by optional categories

**Layer 2: Documents Table (Metadata Only)**
```sql
documents {
  id: uuid
  title: text
  file_type: text (pdf, txt, docx, html)
  file_size: integer (bytes)
  storage_path: text (Supabase Storage path)
  download_url: text (signed URL)
  source_type: text (upload, url, scraped)
  source_url: text (optional)
  category: text (optional)
  summary: text (200-500 chars, NOT full text)
  chunk_count: integer
  metadata: jsonb
  created_at: timestamp
}
```

**Layer 3: Embeddings Table (Searchable Chunks)**
```sql
embeddings {
  id: uuid
  document_id: uuid (foreign key)
  content: text (500 chars max)
  embedding: vector(384) (pgvector type)
  created_at: timestamp
}
```

**Benefits:**
- Original files preserved for download/reprocessing
- No duplicate text storage (memory efficient)
- Fast semantic search via vector embeddings
- Easy document updates (reprocess from Layer 1)

---

## Tech Stack

### Backend
| Category | Technology | Version |
|----------|-----------|---------|
| **Framework** | FastAPI | 0.110.0 |
| **Server** | Uvicorn | 0.27.1 |
| **LLM** | Llama 3.1-8b-instant (Groq) | - |
| **Embeddings** | Sentence Transformers | 2.5.1 |
| **Vector DB** | Supabase (pgvector) | 2.4.0 |
| **Auth** | JWT (python-jose) | 3.3.0 |
| **Password** | Passlib (bcrypt) | 1.7.4 |
| **File Processing** | pypdf, python-docx | 4.0.1, 1.1.0 |
| **Web Scraping** | beautifulsoup4 | 4.12.3 |
| **Rate Limiting** | slowapi | 0.1.9 |

### Frontend
| Category | Technology | Version |
|----------|-----------|---------|
| **Framework** | React | 19.1.1 |
| **Language** | TypeScript | 5.9.3 |
| **Build Tool** | Vite | 7.1.7 |
| **Styling** | Tailwind CSS | 4.1.14 |
| **Animations** | Framer Motion | 12.23.22 |
| **Icons** | Lucide React | 0.544.0 |
| **State** | React Context API | - |
| **Data Fetching** | TanStack Query | 5.90.2 |
| **HTTP Client** | Axios | 1.12.2 |
| **Charts** | Recharts | 3.2.1 |
| **i18n** | i18next + react-i18next | 25.5.3 + 16.0.0 |
| **Routing** | React Router DOM | 7.9.3 |
| **Notifications** | react-hot-toast | 2.6.0 |

---

## Project Structure

### Backend (`/backend`)
```
backend/
├── app/
│   ├── main.py                      # FastAPI application entry point
│   │
│   ├── core/                        # Core configuration
│   │   ├── __init__.py
│   │   ├── config.py               # Settings (Pydantic)
│   │   ├── database.py             # Supabase client
│   │   ├── dependencies.py         # FastAPI dependencies
│   │   └── security.py             # JWT & password hashing
│   │
│   ├── models/                      # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── conversation.py
│   │   ├── feedback.py
│   │   ├── message.py
│   │   ├── settings.py
│   │   └── user.py
│   │
│   ├── services/                    # Business logic
│   │   ├── __init__.py
│   │   ├── embedding_service.py    # Sentence Transformers
│   │   ├── conversation_service.py # Session & history
│   │   ├── rag_service.py          # RAG orchestrator
│   │   ├── vectorstore_service.py  # pgvector search
│   │   ├── llm_service.py          # Groq API
│   │   ├── analytics_service.py    # Metrics
│   │   ├── settings_service.py     # System settings
│   │   └── storage_service.py      # Supabase Storage
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1.py                   # API router aggregator
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── chat.py             # POST /chat/
│   │       ├── documents.py        # CRUD documents
│   │       ├── conversations.py    # Chat history
│   │       ├── feedback.py         # Ratings
│   │       ├── analytics.py        # Dashboard metrics + daily/country
│   │       ├── auth.py             # JWT login
│   │       ├── settings.py         # System settings API
│   │       └── users.py            # User management
│   │
│   ├── utils/                       # Utilities
│   │   ├── __init__.py
│   │   ├── prompts.py              # LLM system prompts
│   │   ├── logger.py               # Logging config
│   │   ├── text_processor.py       # Text chunking
│   │   ├── file_parser.py          # PDF/DOCX parser
│   │   └── url_scraper.py          # Web scraping
│   │
│   └── middleware/                  # Request processing
│       ├── __init__.py
│       ├── cors.py
│       ├── error_handler.py
│       └── rate_limiter.py
│
├── scripts/
│   ├── init_db.py                  # Database initialization
│   ├── seed_knowledge_base.py      # Seed sample data
│   ├── create_admin.py             # Interactive admin user creation
│   ├── quick_create_admin.py       # Quick admin (admin@githaf.com/admin123)
│   ├── create_settings_table.sql   # System settings table migration
│   ├── database_schema.sql         # Full database schema
│   └── vector_search_function.sql  # pgvector RPC function
│
├── requirements.txt
├── .env.example
└── README.md
```

### Frontend (`/frontend`)
```
frontend/
├── src/
│   ├── main.tsx                    # React entry point
│   ├── App.tsx                     # Root component with routing
│   ├── index.css                   # Global styles (Tailwind)
│   ├── i18n.ts                     # i18next configuration
│   │
│   ├── components/
│   │   ├── chat/
│   │   │   └── ChatWidget.tsx      # Main chat interface (334 lines)
│   │   │
│   │   ├── layout/
│   │   │   ├── AdminLayout.tsx     # Dashboard shell + sidebar (translated)
│   │   │   └── ProtectedRoute.tsx  # Auth guard
│   │   │
│   │   ├── analytics/
│   │   │   ├── DailyVisitsChart.tsx
│   │   │   └── CountryStats.tsx
│   │   │
│   │   ├── ui/                     # Reusable components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── LoadingSkeleton.tsx
│   │   │   ├── AnimatedPage.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── DateRangePicker.tsx
│   │   ├── LanguageSelector.tsx    # Multi-language dropdown
│   │   └── ThemeToggle.tsx         # Dark/light mode
│   │
│   ├── pages/
│   │   ├── Home.tsx                # Public landing page
│   │   ├── Login.tsx               # Admin login (translated)
│   │   │
│   │   └── admin/                  # Protected dashboard pages
│   │       ├── Analytics.tsx       # Metrics, charts, stats
│   │       ├── Documents.tsx       # Knowledge base manager
│   │       ├── Conversations.tsx   # Chat history viewer
│   │       ├── Flagged.tsx         # Low-rated queries
│   │       ├── Users.tsx           # User management
│   │       ├── WidgetSettings.tsx  # Chat widget customization
│   │       └── SystemSettings.tsx  # Global configuration (465 lines)
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx         # JWT authentication state
│   │   └── ThemeContext.tsx        # Dark/light theme state
│   │
│   ├── services/
│   │   └── api.ts                  # Axios HTTP client (227 lines)
│   │
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces (195 lines)
│   │
│   ├── utils/
│   │   ├── animations.ts           # Framer Motion variants
│   │   └── session.ts              # Session ID generation
│   │
│   └── locales/                    # i18n translation files
│       ├── en.json                 # English (210 lines)
│       ├── fr.json                 # French
│       ├── de.json                 # German
│       ├── es.json                 # Spanish
│       └── ar.json                 # Arabic
│
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── eslint.config.js
```

---

## Features Implemented

### ✅ Core Features (Complete)

#### 1. **RAG Pipeline** (`backend/app/services/rag_service.py`)
- **Query Embedding:** Converts user query to 384-dimensional vector
- **Similarity Search:** Searches Supabase pgvector (top_k=5, threshold=0.5)
- **Context Retrieval:** Fetches relevant document chunks
- **Prompt Engineering:** Builds context-aware prompt with conversation history
- **LLM Generation:** Groq API (Llama 3.1-8b-instant) generates response
- **Source Citation:** Returns sources with similarity scores
- **Fallback Handling:** Returns friendly message if no context found

**Configuration:**
```python
RAG_TOP_K = 5                        # Retrieve top 5 chunks
RAG_SIMILARITY_THRESHOLD = 0.5       # Minimum cosine similarity
CHUNK_SIZE = 500                     # Characters per chunk
CHUNK_OVERLAP = 50                   # Overlap between chunks
LLM_MODEL = "llama-3.1-8b-instant"  # Groq model
LLM_TEMPERATURE = 0.7                # Response creativity
LLM_MAX_TOKENS = 500                 # Max response length
```

#### 2. **Chat Widget** (`frontend/src/components/chat/ChatWidget.tsx`)
- Interactive UI with Framer Motion animations
- Session management (persistent session_id in localStorage)
- Real-time typing indicators (animated dots)
- Source citations (expandable details)
- Feedback system (thumbs up/down)
- Responsive design (mobile + desktop)
- Auto-scroll to latest message
- Error handling with fallback messages
- **i18n Support:** Fully translated (Session 2)

#### 3. **Authentication & Authorization**
- **JWT Tokens:** HS256 algorithm, 60-minute expiry
- **OAuth2 Password Flow:** `POST /api/v1/auth/login`
- **Protected Routes:** Frontend `<ProtectedRoute>` wrapper
- **Password Hashing:** bcrypt via passlib
- **Token Interceptor:** Axios automatically adds Bearer token
- **Auto-redirect:** 401 responses redirect to login

#### 4. **Admin Dashboard** (7 Pages)

##### **Analytics Page** (`Analytics.tsx`)
- Total conversations, messages, satisfaction rate, response rate
- Trending queries (bar chart with Recharts)
- Daily visits over time (line chart)
- Country statistics with flags
- Date range picker (7d/30d/90d/custom)
- Real-time metrics

##### **Documents Page** (`Documents.tsx`)
- Upload files (PDF, TXT, DOCX)
- Scrape URLs (web pages)
- View document metadata (title, size, chunks, category, date)
- Delete documents
- Download original files
- Category tagging
- Animated list with Framer Motion

##### **Conversations Page** (`Conversations.tsx`)
- List all chat sessions
- View conversation details (full message history)
- Filter by date/session
- Session metadata (start time, message count)

##### **Flagged Queries Page** (`Flagged.tsx`)
- Low-rated responses (rating = 0)
- Review problematic queries
- Identify knowledge gaps
- View user comments

##### **Users Page** (`Users.tsx`)
- Create admin users
- Manage user accounts (email, full name, role)
- Delete users
- View creation dates

##### **Widget Settings Page** (`WidgetSettings.tsx`)
- Customize chat widget appearance
- Position selector (top-left, top-right, bottom-left, bottom-right)
- Color pickers (primary, accent)
- Button size (small, medium, large)
- Theme selection (modern, minimal, classic)
- Greeting message editor
- Embed code generator with copy function
- Live preview
- **Status:** ⚠️ UI complete, backend API not implemented

##### **System Settings Page** (`SystemSettings.tsx`)
- **Theme Settings:**
  - Default theme (light/dark)
  - Allow theme switching toggle
  - Inherit host website theme
- **Language Settings:**
  - Default language selector
  - Multi-select enabled languages (EN, FR, DE, ES, AR)
  - Translate AI responses toggle
  - Enable RTL support toggle
- **Analytics Settings:**
  - Enable country tracking
  - Enable world map
  - Default date range (7d/30d/90d/custom)
- **Privacy Settings:**
  - Anonymize IP addresses (GDPR)
  - Store IP addresses toggle
  - Privacy compliance notice
- **Status:** ✅ **FULLY IMPLEMENTED - Jan 10, 2025**
  - Backend API complete with database persistence
  - Frontend loads from and saves to backend
  - LocalStorage used as fallback/cache
  - Fixed camelCase/snake_case issue (Session 3)

#### 5. **Internationalization (i18n)** ✅ **COMPLETED Oct 9, 2025**
- **5 Languages:** English, French, German, Spanish, Arabic
- **Complete Translations:** 210 keys covering all UI elements
- **Features:**
  - Language selector dropdown with flags
  - Browser language detection
  - Persistent selection (localStorage)
  - RTL (Right-to-Left) support for Arabic
  - System settings integration
  - Smooth language switching
- **Files:**
  - `src/i18n.ts` - Configuration (76 lines)
  - `src/locales/en.json` - English translations (210 lines)
  - `src/locales/fr.json` - French
  - `src/locales/de.json` - German
  - `src/locales/es.json` - Spanish
  - `src/locales/ar.json` - Arabic
  - `src/components/LanguageSelector.tsx` - Dropdown component (134 lines)
- **Status:** ✅ **PARTIALLY APPLIED - Jan 10, 2025**
  - Core components translated: Login, AdminLayout, ChatWidget
  - Remaining components: Home, Analytics, Documents, Conversations, Flagged, Users, WidgetSettings

#### 6. **Theme System** ✅ **COMPLETED**
- **ThemeContext** (`contexts/ThemeContext.tsx`)
  - Dark/light mode state management
  - Persistent theme selection (localStorage)
  - System preference detection
- **ThemeToggle** (`components/ThemeToggle.tsx`)
  - Sun/Moon icon toggle
  - Framer Motion animations
  - Respects system settings (can be disabled)
- **Current State:** App uses dark theme by default (slate-900 base)

#### 7. **Document Management**
- **File Upload:** PDF, TXT, DOCX via multipart/form-data
- **URL Scraping:** BeautifulSoup4 for web content extraction
- **Text Processing:**
  - Chunking (500 chars, 50 overlap)
  - Embedding generation (384-dim vectors)
  - Storage in Supabase pgvector
- **Metadata Storage:**
  - Title, file type, size, source URL
  - Category tagging
  - Chunk count, creation date
  - Signed download URLs
- **API Endpoints:**
  - `POST /api/v1/documents/upload` - Upload file
  - `POST /api/v1/documents/url` - Scrape URL
  - `GET /api/v1/documents/` - List documents
  - `GET /api/v1/documents/{id}` - Get document
  - `DELETE /api/v1/documents/{id}` - Delete document

#### 8. **Analytics & Metrics**
- **Conversation Metrics:**
  - Total conversations
  - Total messages
  - Average messages per conversation
- **Satisfaction Metrics:**
  - Average satisfaction score
  - Response rate
  - Total feedback count
- **Knowledge Base Metrics:**
  - Total documents
  - Total chunks (embeddings)
- **Trending Queries:**
  - Most frequently asked questions
  - Query count tracking
- **Daily Stats:** `GET /api/v1/analytics/daily?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
  - Returns conversations, messages, satisfaction by date
- **Country Stats:** `GET /api/v1/analytics/countries?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
  - Currently returns mock data (IP tracking not implemented)
- **Status:** ✅ **ENDPOINTS IMPLEMENTED - Jan 10, 2025**
  - Daily stats fully functional
  - Country stats returns placeholder data pending IP tracking

#### 9. **Security & Middleware**
- **CORS:** Configured for localhost:5173, localhost:3000
- **Rate Limiting:** 10 requests/minute per IP for chat endpoint
- **Error Handling:** Global exception handler with logging
- **Input Validation:** Pydantic schemas for all endpoints
- **Password Security:** bcrypt hashing with salt
- **Token Expiry:** 60-minute JWT expiration

#### 10. **Database Integration (Supabase)**
- **Tables:**
  - `users` - Admin accounts
  - `documents` - Knowledge base metadata
  - `embeddings` - Vector storage (pgvector)
  - `conversations` - Chat sessions
  - `messages` - Individual messages
  - `feedback` - User ratings
  - `system_settings` - Global configuration (added Session 2)
- **Vector Search:** pgvector extension for similarity search
- **Client:** Singleton pattern for connection management

---

## Database Schema

### Tables

#### **users**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  is_active BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
```

**Default Admin:**
- Email: `admin@githaf.com` (created via quick_create_admin.py)
- Password: `admin123` (change in production!)

#### **documents**
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_type TEXT NOT NULL,  -- pdf, txt, docx, html
  file_size INTEGER,         -- bytes
  storage_path TEXT,         -- Supabase Storage path
  download_url TEXT,         -- signed URL
  source_type TEXT NOT NULL, -- upload, url, scraped
  source_url TEXT,           -- original URL if applicable
  category TEXT,             -- optional category
  summary TEXT,              -- 200-500 char preview (NOT full text)
  chunk_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_source_type ON documents(source_type);
```

**Important:** This table does NOT store full document text (memory efficient)

#### **embeddings**
```sql
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(384) NOT NULL,  -- pgvector type
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_embeddings_document_id ON embeddings(document_id);
CREATE INDEX idx_embeddings_embedding ON embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

**Vector Index Configuration:**
```sql
-- pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Vector search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    embeddings.id,
    embeddings.document_id,
    embeddings.content,
    1 - (embeddings.embedding <=> query_embedding) AS similarity
  FROM embeddings
  WHERE 1 - (embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**Distance Operators:**
- `<->` Euclidean distance (L2)
- `<#>` Negative inner product
- `<=>` Cosine distance (used in this project)

**Cosine Similarity Formula:**
```
similarity = 1 - cosine_distance
where cosine_distance = 1 - (A · B) / (||A|| * ||B||)
```

#### **conversations**
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
```

#### **messages**
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  context_used JSONB,  -- stores sources used for response
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

#### **feedback**
```sql
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating IN (0, 1)),  -- 0=thumbs down, 1=thumbs up
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_feedback_message_id ON feedback(message_id);
CREATE INDEX idx_feedback_rating ON feedback(rating);
```

#### **system_settings**
```sql
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Theme Settings
    default_theme VARCHAR(10) DEFAULT 'dark' CHECK (default_theme IN ('light', 'dark')),
    allow_theme_switching BOOLEAN DEFAULT TRUE,
    inherit_host_theme BOOLEAN DEFAULT TRUE,

    -- Language Settings
    default_language VARCHAR(5) DEFAULT 'en',
    enabled_languages TEXT[] DEFAULT '{"en","fr","de","es","ar"}',
    translate_ai_responses BOOLEAN DEFAULT TRUE,
    enable_rtl BOOLEAN DEFAULT TRUE,

    -- Analytics Settings
    enable_country_tracking BOOLEAN DEFAULT TRUE,
    default_date_range VARCHAR(10) DEFAULT '30d' CHECK (default_date_range IN ('7d', '30d', '90d', 'custom')),
    enable_world_map BOOLEAN DEFAULT TRUE,

    -- Privacy Settings
    anonymize_ips BOOLEAN DEFAULT TRUE,
    store_ip_addresses BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings (only if table is empty)
INSERT INTO system_settings (
    default_theme, allow_theme_switching, inherit_host_theme,
    default_language, enabled_languages, translate_ai_responses, enable_rtl,
    enable_country_tracking, default_date_range, enable_world_map,
    anonymize_ips, store_ip_addresses
)
SELECT 'dark', TRUE, TRUE, 'en', '{"en","fr","de","es","ar"}', TRUE, TRUE,
       TRUE, '30d', TRUE, TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

CREATE INDEX IF NOT EXISTS idx_system_settings_updated_at ON system_settings(updated_at);
```

---

## API Endpoints

### Base URL
```
Development: http://localhost:8000
Production: TBD
```

### Public Endpoints (No Authentication)

#### Health Check
```http
GET /health

Response 200:
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected"
}
```

#### Chat
```http
POST /api/v1/chat/

Headers:
  Content-Type: application/json

Body:
{
  "message": "What services do you offer?",
  "session_id": "optional-uuid"  // auto-generated if not provided
}

Response 200:
{
  "response": "Githaf Consulting offers...",
  "sources": [
    {
      "id": "uuid",
      "content": "Githaf Consulting specializes in...",
      "similarity": 0.85
    }
  ],
  "context_found": true,
  "session_id": "uuid",
  "message_id": "uuid"
}

Rate Limit: 10 requests per minute per IP
```

#### Submit Feedback
```http
POST /api/v1/feedback/

Headers:
  Content-Type: application/json

Body:
{
  "message_id": "uuid",
  "rating": 1,  // 0 or 1
  "comment": "Very helpful!" (optional)
}

Response 200:
{
  "success": true,
  "message": "Feedback recorded"
}
```

### Protected Endpoints (JWT Authentication Required)

**Authentication Header:**
```http
Authorization: Bearer <access_token>
```

#### Login
```http
POST /api/v1/auth/login

Headers:
  Content-Type: application/x-www-form-urlencoded

Body:
username=admin@githaf.com&password=admin123

Response 200:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}

Response 401:
{
  "detail": "Incorrect username or password"
}
```

#### Documents
```http
GET /api/v1/documents/
GET /api/v1/documents/?limit=100&offset=0

Response 200:
{
  "documents": [
    {
      "id": "uuid",
      "title": "company_overview.pdf",
      "file_type": "pdf",
      "file_size": 245678,
      "storage_path": "documents/uuid/company_overview.pdf",
      "download_url": "https://...supabase.co/storage/...",
      "source_type": "upload",
      "category": "general",
      "summary": "Overview of company services...",
      "chunk_count": 15,
      "created_at": "2025-10-09T10:30:00Z"
    }
  ],
  "total": 42
}

---

POST /api/v1/documents/upload

Headers:
  Content-Type: multipart/form-data
  Authorization: Bearer <token>

Body:
  file: <binary>
  category: "general" (optional)

Response 200:
{
  "success": true,
  "message": "Document uploaded and processed successfully",
  "document": { ... }
}

---

POST /api/v1/documents/url

Headers:
  Content-Type: application/x-www-form-urlencoded
  Authorization: Bearer <token>

Body:
url=https://example.com/article&category=blog

Response 200:
{
  "success": true,
  "message": "URL content processed successfully",
  "document": { ... }
}

---

DELETE /api/v1/documents/{document_id}

Response 200:
{
  "success": true,
  "message": "Document deleted successfully"
}
```

#### Conversations
```http
GET /api/v1/conversations/

Response 200:
{
  "conversations": [
    {
      "id": "uuid",
      "session_id": "uuid",
      "created_at": "2025-10-09T10:00:00Z",
      "last_message_at": "2025-10-09T10:15:00Z",
      "message_count": 8,
      "avg_rating": 0.75
    }
  ],
  "total": 156
}

---

GET /api/v1/conversations/{conversation_id}

Response 200:
{
  "id": "uuid",
  "session_id": "uuid",
  "created_at": "2025-10-09T10:00:00Z",
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "What services do you offer?",
      "created_at": "2025-10-09T10:00:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Githaf Consulting offers...",
      "context_used": { "sources": [...] },
      "created_at": "2025-10-09T10:00:05Z"
    }
  ]
}
```

#### Analytics
```http
GET /api/v1/analytics/

Response 200:
{
  "conversation_metrics": {
    "total_conversations": 156,
    "total_messages": 892,
    "avg_messages_per_conversation": 5.7
  },
  "satisfaction_metrics": {
    "avg_satisfaction": 0.82,
    "response_rate": 0.65,
    "total_feedback": 234
  },
  "knowledge_base_metrics": {
    "total_documents": 42,
    "total_chunks": 856
  },
  "trending_queries": [
    { "query": "What services do you offer?", "count": 34 },
    { "query": "How do I contact support?", "count": 28 }
  ]
}

---

GET /api/v1/analytics/flagged
GET /api/v1/analytics/flagged?limit=20

Response 200:
[
  {
    "message_id": "uuid",
    "conversation_id": "uuid",
    "query": "User question...",
    "response": "Bot response...",
    "rating": 0,
    "comment": null,
    "created_at": "2025-10-09T10:30:00Z"
  }
]

---

GET /api/v1/analytics/daily?start_date=2025-01-01&end_date=2025-01-10

Response 200:
{
  "daily_stats": [
    {
      "date": "2025-01-01",
      "conversations": 15,
      "messages": 87,
      "avg_satisfaction": 0.85
    },
    ...
  ]
}

---

GET /api/v1/analytics/countries?start_date=2025-01-01&end_date=2025-01-10

Response 200:
{
  "country_stats": [
    {
      "country_code": "US",
      "country_name": "United States",
      "visitors": 145,
      "percentage": 42.5
    },
    ...
  ]
}

Note: Country stats currently returns mock data (IP tracking not implemented)
```

#### Users
```http
GET /api/v1/users/

Response: Array of user objects

---

POST /api/v1/users/

Body:
{
  "email": "user@example.com",
  "password": "secure_password",
  "full_name": "John Doe",
  "is_admin": false
}

Response: Created user object

---

DELETE /api/v1/users/{user_id}

Response: 204 No Content
```

#### System Settings
```http
GET /api/v1/settings/

Response:
{
  "defaultTheme": "dark",
  "allowThemeSwitching": true,
  "inheritHostTheme": true,
  "defaultLanguage": "en",
  "enabledLanguages": ["en", "fr", "de", "es", "ar"],
  "translateAIResponses": true,
  "enableRTL": true,
  "enableCountryTracking": true,
  "defaultDateRange": "30d",
  "enableWorldMap": true,
  "anonymizeIPs": true,
  "storeIPAddresses": false
}

---

PUT /api/v1/settings/

Request: SystemSettings object (camelCase)
Response: Updated SystemSettings object

---

POST /api/v1/settings/reset

Response: Default SystemSettings object
```

### Interactive API Documentation

**Swagger UI:** http://localhost:8000/docs
**ReDoc:** http://localhost:8000/redoc

---

## Data Flow

### Chat Request Flow
```
1. User types message in ChatWidget
   ↓
2. ChatWidget.handleSend()
   - Add user message to local state
   - Show loading indicator
   ↓
3. apiService.sendMessage(message, sessionId)
   - POST /api/v1/chat/
   ↓
4. Backend: chat.py route handler
   - Call get_or_create_conversation(session_id)
   - Save user message to database
   ↓
5. RAG Service: get_rag_response()
   ├─ Step 1: Embed query
   │  └─ embedding_service.get_embedding()
   │     └─ Sentence Transformers model
   ├─ Step 2: Similarity search
   │  └─ vectorstore_service.similarity_search()
   │     └─ PostgreSQL match_documents() RPC
   │        └─ pgvector cosine distance
   ├─ Step 3: Get conversation history
   │  └─ conversation_service.get_conversation_history()
   ├─ Step 4: Build prompt
   │  └─ Format RAG_SYSTEM_PROMPT with context + history
   ├─ Step 5: Generate response
   │  └─ llm_service.generate_response()
   │     └─ Groq API (Llama 3.1)
   └─ Step 6: Return response + sources
   ↓
6. Backend: Save assistant message
   - conversation_service.save_message()
   ↓
7. Backend: Return ChatResponse
   ↓
8. Frontend: ChatWidget receives response
   - Add bot message to state
   - Hide loading indicator
   - Render message with sources + feedback buttons
```

### Document Upload Flow
```
1. Admin selects file in Documents page
   ↓
2. Upload modal → apiService.uploadDocument(file, category)
   - FormData with file blob
   - POST /api/v1/documents/upload
   ↓
3. Backend: documents.py route handler
   - Read file content
   - Call document_service.process_file_upload()
   ↓
4. Document Service: process_and_store_document()
   ├─ Step 1: Upload to Supabase Storage (Layer 1)
   ├─ Step 2: Extract text (in-memory, temporary)
   ├─ Step 3: Create metadata record (Layer 2)
   ├─ Step 4: Chunk text (500-char chunks, 50 overlap)
   ├─ Step 5: Generate embeddings (batch)
   ├─ Step 6: Store embeddings (Layer 3)
   ├─ Step 7: Update document metadata
   └─ Step 8: Discard full text (garbage collected)
   ↓
5. Backend: Return enriched document metadata
   ↓
6. Frontend: Documents page updates
   - Refresh document list
   - Show success notification
```

---

## Frontend Routes

```
/                     → Home page (public landing)
/login               → Admin login (OAuth2 form)

Protected Routes (require JWT):
/admin               → Analytics dashboard
/admin/documents     → Knowledge base manager
/admin/conversations → Chat history viewer
/admin/flagged       → Low-rated queries
/admin/users         → User management
/admin/widget        → Widget customization
/admin/settings      → System configuration

Fallback:
/*                   → Redirect to /
```

**Auth Guard:** All `/admin/*` routes wrapped in `<ProtectedRoute>` component

---

## Configuration

### Backend Environment Variables (`.env`)
```bash
# API Configuration
API_V1_STR=/api/v1
PROJECT_NAME=Githaf Chatbot API

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Groq API
GROQ_API_KEY=your-groq-api-key

# Embedding Model
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384

# RAG Configuration
RAG_TOP_K=5
RAG_SIMILARITY_THRESHOLD=0.5
CHUNK_SIZE=500
CHUNK_OVERLAP=50

# LLM Configuration
LLM_MODEL=llama-3.1-8b-instant
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500

# Authentication
SECRET_KEY=your-secret-key-here  # Generate with: openssl rand -hex 32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# CORS
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:5173"]

# Server
HOST=0.0.0.0
PORT=8000
```

### Frontend Environment Variables (`.env`)
```bash
VITE_API_BASE_URL=http://localhost:8000
```

**Access in code:**
```typescript
import.meta.env.VITE_API_BASE_URL
```

### Model Configuration

**Sentence Transformers Model:**
- Model: `all-MiniLM-L6-v2`
- Dimension: 384
- Size: ~100MB
- Cache: `~/.cache/huggingface/`
- Download: Automatic on first use

**Groq Model:**
- Model: `llama-3.1-8b-instant`
- Speed: ~500 tokens/second
- Context: 8192 tokens
- Free Tier: 14,400 requests/day

---

## Security

### Authentication

**Method:** JWT (JSON Web Tokens)
**Algorithm:** HS256 (HMAC with SHA-256)
**Token Location:** `Authorization: Bearer <token>` header
**Storage:** Frontend localStorage (`access_token`)
**Expiration:** 60 minutes

**Token Payload:**
```json
{
  "sub": "user_id",
  "exp": 1696867200
}
```

**Password Hashing:**
- Algorithm: bcrypt
- Rounds: 12 (default in passlib)
- Salt: Auto-generated per password

### Rate Limiting

**Library:** SlowAPI (FastAPI wrapper for limits)

**Configuration:**
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/chat/")
@limiter.limit("10/minute")
async def chat(request: Request, ...):
    ...
```

**Limits:**
- Chat endpoint: 10 requests/minute per IP
- Other endpoints: No limit (protected by authentication)

### CORS

**Configuration:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
```

**Production:** Update `ALLOWED_ORIGINS` to include production domain

### Input Validation

**Pydantic Models:**
All API inputs validated with Pydantic schemas

Example:
```python
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = Field(None, max_length=100)
```

### SQL Injection Prevention

**Protection:** All database queries use parameterized statements via Supabase client

Example:
```python
# SAFE - Parameterized
response = client.table("users").select("*").eq("email", email).execute()
```

### XSS Prevention

**Frontend:** React automatically escapes HTML in JSX
**Backend:** Pydantic validates and sanitizes inputs

### File Upload Security

**Restrictions:**
- Max file size: Enforced by Supabase Storage (configurable)
- Allowed extensions: PDF, DOCX, TXT (validated)
- File parsing: Sandboxed (no code execution)

**Malware Scanning:** Not implemented (consider ClamAV for production)

---

## Recent Changes

### **January 10, 2025 - Session 5** ✅ **CONVERSATION FLOW COMPLETE**
- 🤖 **Implemented Advanced Intent Classification System with LLM Fallback (MAJOR FEATURE)** ✅
  - **Problem Solved:** Generic queries like "hello", "hi", "thank you" now get appropriate conversational responses instead of fallback errors
  - **Created `intent_service.py`** (371 lines) - Hybrid intent detection with 8 intent types:
    - `GREETING` - Hello, hi, good morning, etc. (supports EN/FR/DE/ES/AR)
    - `FAREWELL` - Goodbye, bye, see you later, etc.
    - `GRATITUDE` - Thank you, thanks, appreciate, etc.
    - `HELP` - Help requests, "what can you do", etc.
    - `CHIT_CHAT` - How are you, what's your name, are you there, etc.
    - `OUT_OF_SCOPE` - Off-topic questions (weather, politics, etc.) **[NEW]**
    - `QUESTION` - Actual knowledge-seeking queries (goes to RAG)
    - `UNKNOWN` - Unclear or ambiguous queries
  - **Hybrid Classification Strategy:**
    - **Step 1:** Fast pattern matching (~5ms) for obvious intents (greetings, farewells)
    - **Step 2:** LLM fallback (~200ms) for ambiguous cases using Groq API
    - **Confidence Scoring:** 0.0-1.0 scale (high-confidence patterns skip LLM)
  - **Updated `prompts.py`** - Added 7 response template categories:
    - `GREETING_RESPONSES` (5 variations)
    - `FAREWELL_RESPONSES` (5 variations)
    - `GRATITUDE_RESPONSES` (5 variations)
    - `HELP_RESPONSE` (comprehensive feature list)
    - `CHIT_CHAT_RESPONSES` (contextual responses)
    - `OUT_OF_SCOPE_RESPONSE` (polite redirect) **[NEW]**
    - `CONVERSATIONAL_WITH_CONTEXT_PROMPT` (context-aware LLM prompt) **[NEW]**
  - **Conversation Context Tracking** ✅
    - Modified `get_conversational_response()` to accept `session_id` parameter
    - Retrieves last 3 messages for context on ambiguous follow-ups ("yes", "no", "okay")
    - Uses LLM with `CONVERSATIONAL_WITH_CONTEXT_PROMPT` for natural continuity
    - Fixes issue: Bot now remembers previous messages in conversation flow
  - **Out-of-Scope Detection** ✅
    - LLM classifier detects OFF_TOPIC questions (weather, politics, celebrities)
    - Polite redirect response: "I'm specifically designed to help with Githaf Consulting..."
    - Avoids fallback errors for irrelevant questions
  - **Modified `rag_service.py`** - Enhanced intent routing with context support:
    - Step 0: Classify intent using hybrid approach (pattern + LLM fallback)
    - Conversational intents → Direct responses with session context (no RAG needed)
    - OUT_OF_SCOPE intents → Polite redirect (no RAG/fallback)
    - Questions → Full RAG pipeline with embeddings/search/LLM
  - **Test Results:** 100% accuracy (11/11 edge cases passed)
    - ✅ "can i ask you a question?" → CHIT_CHAT (not fallback)
    - ✅ "who is the president of the USA?" → OUT_OF_SCOPE (not fallback)
    - ✅ "yes" → CHIT_CHAT with context support (not fallback)
    - ✅ "Are you there?" → CHIT_CHAT
    - ✅ "What's the weather today?" → OUT_OF_SCOPE
  - **Performance Impact:**
    - Conversational queries: ~50ms pattern match (vs ~2-3 sec RAG)
    - Ambiguous queries: ~250ms with LLM fallback
    - No wasted embeddings or LLM tokens on greetings
    - Better user experience with natural conversation flow
  - **Multi-language Support:** Intent patterns include FR/DE/ES/AR greetings
  - **Files Created/Modified:**
    - `backend/app/services/intent_service.py` (371 lines) - Hybrid LLM + patterns
    - `backend/app/utils/prompts.py` (183 lines) - Added OUT_OF_SCOPE + context prompts
    - `backend/app/services/rag_service.py` (261 lines) - Context tracking + session_id
    - `backend/test_intent.py` (79 lines) - Pattern-based tests
    - `backend/test_hybrid_intent.py` (79 lines) - LLM fallback tests
    - `backend/test_quick_flow.py` (74 lines) - Edge case validation (100% pass)
    - `backend/test_conversation_flow.py` (128 lines) - Multi-turn flow tests

### **January 10, 2025 - Session 4**
- 🎨 **Fixed Theme Switching** - Added light mode CSS variables in `index.css:32-44`; text now pure black (#000000) in light mode
- 🌈 **Global Theme Support** - Extended themes to entire website via Tailwind config custom colors (`text-theme-primary`, `bg-theme-primary`, etc.)
- 📄 **Updated All Pages** - Removed hardcoded colors in Home.tsx and Login.tsx; now use theme-aware Tailwind classes
- 🔄 **Bidirectional Theme Sync** - SystemSettings dropdown ↔ ThemeToggle icon now fully synchronized; changes reflect immediately in both
- 💾 **Enhanced Save Button** - Added loading spinner and three-state feedback in `SystemSettings.tsx:31-165`
- 🌍 **Language Selector Redesign** - Converted button grid to multi-select dropdown with compact tags in `SystemSettings.tsx:275-360`
- ✅ **Database Table Created** - `system_settings` table successfully created; 500 error resolved

### **January 10, 2025 - Session 3**
- 🐛 **Fixed System Settings API Field Naming Mismatch**
  - **Issue:** Frontend uses camelCase (`defaultTheme`, `enabledLanguages`) but backend used snake_case (`default_theme`, `enabled_languages`)
  - **Impact:** Settings page would load then immediately disappear due to API parsing errors
  - **Fix:** Updated `backend/app/models/settings.py`:
    - Added Pydantic `Field()` aliases for all fields (e.g., `Field(default="dark", alias="defaultTheme")`)
    - Added `alias_generator = to_camel` to auto-convert field names
    - Added `populate_by_name = True` to accept both naming conventions
  - **Result:** Settings page now loads correctly, frontend-backend communication works seamlessly
  - **Files Modified:**
    - `backend/app/models/settings.py` - Added Field aliases and Config settings

- 🔧 **Created Admin User Bootstrap Script**
  - Created `backend/scripts/quick_create_admin.py` for easy admin user creation
  - Default credentials: `admin@githaf.com` / `admin123`
  - Auto-detects if user already exists
  - **Files Created:**
    - `backend/scripts/quick_create_admin.py`

- 📝 **Documentation Updates**
  - Consolidated `claudeFrontend.md` and `claudeBackend.md` into single `claude.md`
  - Version bumped to 1.1.1
  - Documented field naming convention fix

### **January 10, 2025 - Session 2**
- ✅ **Applied i18n Translations to Core Components**
  - Updated Login.tsx with full translation support
  - Updated AdminLayout.tsx (sidebar navigation)
  - Updated ChatWidget.tsx (all user-facing strings)
  - Components now respond to language changes in real-time

- ✅ **Implemented System Settings Backend API (COMPLETE)**
  - Created `models/settings.py` - Pydantic schema for SystemSettings
  - Created `services/settings_service.py` - CRUD operations for settings
  - Created `api/routes/settings.py` - GET, PUT, POST /reset endpoints
  - Created SQL migration script `scripts/create_settings_table.sql`
  - Registered settings router in `api/v1.py`
  - Updated `SystemSettings.tsx` to use backend API instead of localStorage
  - Added loading states, error handling, and fallback logic
  - Settings now persist across devices and users

- ✅ **Implemented Analytics Endpoints (COMPLETE)**
  - Added `GET /api/v1/analytics/daily` endpoint with date range support
  - Added `GET /api/v1/analytics/countries` endpoint (mock data for now)
  - Implemented `get_daily_stats()` in analytics_service.py
    - Groups conversations, messages, and feedback by date
    - Calculates daily satisfaction averages
    - Validates date ranges
  - Implemented `get_country_stats()` in analytics_service.py
    - Returns placeholder data (pending IP tracking implementation)
    - Documented full implementation requirements
  - Frontend charts now have backend data support

### **January 10, 2025 - Session 1**
- 📝 Created comprehensive documentation file (`claudeFrontend.md`)
- 📊 Documented all implemented features and architecture
- 🗺️ Mapped project structure and file organization

### **October 9, 2025**
- 🌐 **Implemented Multi-Language Support (i18n)**
  - Created 5 complete translation files (EN, FR, DE, ES, AR)
  - Built LanguageSelector component with flag dropdown
  - Added RTL support for Arabic
  - Integrated with i18next and react-i18next
  - Connected to SystemSettings

- 🎨 **Built Theme Toggle System**
  - Created ThemeContext for state management
  - Built ThemeToggle component with animations
  - Added system settings integration

- ⚙️ **Completed System Settings Page (406 lines)**
  - Theme settings (default theme, switching, inheritance)
  - Language settings (default, enabled languages, AI translation, RTL)
  - Analytics settings (country tracking, world map, date range)
  - Privacy settings (IP anonymization, GDPR compliance)

### **Prior to October 9, 2025**
- ✅ Backend API fully implemented (chat, documents, auth, analytics, users)
- ✅ RAG pipeline with Groq + Sentence Transformers + pgvector
- ✅ Frontend dashboard with 7 admin pages
- ✅ Chat widget with animations and feedback
- ✅ Document upload & URL scraping
- ✅ Analytics with charts (Recharts)
- ✅ User management
- ✅ JWT authentication
- ✅ Rate limiting and CORS

---

## Known Issues

### High Priority
1. ⚠️ **i18n Partially Applied**
   - ✅ Core components translated: Login, AdminLayout, ChatWidget
   - ❌ Remaining components use hardcoded English: Home, Analytics, Documents, Conversations, Flagged, Users, WidgetSettings
   - **Impact:** Language switching works for auth/navigation but not for dashboard pages

2. ⚠️ **Country Stats Using Mock Data**
   - Daily stats endpoint fully functional
   - Country stats returns placeholder data
   - Requires IP address tracking in conversations table
   - Requires GeoIP library integration (geoip2)
   - Must respect privacy settings (anonymization)
   - **Impact:** Country analytics show demo data, not real visitor data

### Medium Priority
3. ⚠️ **Widget Settings Not Functional**
   - Frontend UI complete (WidgetSettings.tsx)
   - Backend API not implemented
   - No database schema
   - **Impact:** Widget customization doesn't persist

4. ⚠️ **AI Translation Not Implemented**
   - Toggle exists in System Settings
   - No backend logic to translate AI responses
   - Would require translation API integration
   - **Impact:** AI always responds in English regardless of selected language

### Low Priority
5. 📝 **No Tests**
   - No unit tests for backend
   - No integration tests
   - No frontend tests
   - **Impact:** Potential bugs, hard to refactor

6. 🐳 **No Docker Configuration**
   - No Dockerfile
   - No docker-compose.yml
   - **Impact:** Manual deployment setup required

7. 📊 **No Logging Dashboard**
   - Logs written to `backend/logs/app.log`
   - No UI for viewing logs
   - **Impact:** Must SSH to server to view logs

---

## TODO/Roadmap

### Phase 1: Complete Existing Features (High Priority)

#### 1.1 Complete i18n Translation ✅ PARTIALLY DONE
**Estimate:** 2-3 hours (remaining)
- [x] Add `useTranslation()` hook to Login.tsx ✅
- [x] Add `useTranslation()` hook to AdminLayout.tsx ✅
- [x] Add `useTranslation()` hook to ChatWidget.tsx ✅
- [ ] Add `useTranslation()` to remaining components:
  - `Home.tsx` - Landing page
  - `Analytics.tsx` - Dashboard labels
  - `Documents.tsx` - Knowledge base UI
  - `Conversations.tsx` - History viewer
  - `Flagged.tsx` - Flagged queries
  - `Users.tsx` - User management
  - `WidgetSettings.tsx` - Widget config
- [ ] Test language switching on all pages
- [ ] Fix any missing translation keys

#### 1.2 System Settings Backend ✅ COMPLETE
- [x] Create database table `system_settings` ✅
- [x] Create Pydantic schema `models/settings.py` ✅
- [x] Build `api/routes/settings.py` with GET/PUT/POST endpoints ✅
- [x] Add service `services/settings_service.py` ✅
- [x] Update frontend API service to call backend ✅
- [x] Test settings persistence ✅
- [x] Handle default settings on first load ✅
- [x] Added reset endpoint ✅
- [x] Fixed camelCase/snake_case naming mismatch ✅

#### 1.3 Analytics Endpoints ✅ COMPLETE
- [x] Implement `GET /api/v1/analytics/daily` ✅
- [x] Implement `GET /api/v1/analytics/countries` (mock data) ✅
- [ ] Add IP tracking to conversations table (FUTURE)
- [ ] Use IP geolocation library (geoip2) (FUTURE)
- [ ] Aggregate by country code (FUTURE)
- [ ] Respect privacy settings (anonymization) (FUTURE)

### Phase 2: Enhanced Features (Medium Priority)

#### 2.1 Widget Customization Backend
**Estimate:** 4-6 hours
- [ ] Create database table `widget_settings`
- [ ] Create Pydantic schema `models/widget.py`
- [ ] Build `api/routes/widget.py` with CRUD endpoints
- [ ] Connect frontend to backend
- [ ] Generate dynamic embed code with settings

#### 2.2 AI Response Translation
**Estimate:** 8-10 hours (complex)
- [ ] Research translation APIs (Google Translate, DeepL, LibreTranslate)
- [ ] Add translation service to backend
- [ ] Modify RAG pipeline to translate responses
- [ ] Cache translations to reduce API calls
- [ ] Test with all 5 languages
- [ ] Handle translation errors gracefully

#### 2.3 Real-time Updates
**Estimate:** 6-8 hours
- [ ] Implement WebSocket support (Socket.IO or native)
- [ ] Add real-time analytics updates
- [ ] Show live conversation count
- [ ] Display active users indicator
- [ ] Test performance with multiple clients

### Phase 3: Testing & Quality (High Priority)

#### 3.1 Backend Tests
**Estimate:** 10-12 hours
- [ ] Set up pytest
- [ ] Write unit tests for services
- [ ] Write integration tests for API endpoints
- [ ] Mock external dependencies (Groq, Supabase)
- [ ] Achieve >80% code coverage

#### 3.2 Frontend Tests
**Estimate:** 8-10 hours
- [ ] Set up Vitest + React Testing Library
- [ ] Write component tests
- [ ] Write integration tests for pages
- [ ] Test user flows (login, chat, document upload)
- [ ] Achieve >70% coverage

### Phase 4: Deployment & DevOps

#### 4.1 Dockerization
**Estimate:** 4-6 hours
- [ ] Create Dockerfile for backend
- [ ] Create Dockerfile for frontend
- [ ] Create docker-compose.yml
- [ ] Test local Docker setup
- [ ] Document Docker deployment

#### 4.2 Production Deployment
**Estimate:** 8-10 hours
- [ ] Backend: Deploy to Railway/Render/AWS EC2
- [ ] Frontend: Deploy to Vercel/Netlify
- [ ] Configure environment variables
- [ ] Set up HTTPS/SSL
- [ ] Configure custom domain
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Configure backup strategy for Supabase

### Phase 5: Advanced Features (Future)

#### 5.1 Email Notifications
- [ ] Send admin alerts for flagged queries
- [ ] Weekly analytics reports
- [ ] User account emails

#### 5.2 WhatsApp Integration
- [ ] Integrate with WhatsApp Business API
- [ ] Route WhatsApp messages to chatbot
- [ ] Handle WhatsApp media (images, documents)

#### 5.3 Voice Support
- [ ] Add speech-to-text (Web Speech API)
- [ ] Add text-to-speech for responses
- [ ] Mobile voice mode

#### 5.4 Advanced Analytics
- [ ] Export to CSV/Excel/PDF
- [ ] Custom reports builder
- [ ] Conversation sentiment analysis
- [ ] Topic clustering

#### 5.5 Multi-tenant Support
- [ ] Support multiple organizations
- [ ] Separate knowledge bases
- [ ] Per-tenant branding

---

## Deployment

### Backend Deployment

**Status:** ✅ Ready for deployment

**Requirements:**
- Python 3.9+
- 512MB RAM minimum (2GB recommended)
- PostgreSQL 14+ with pgvector

**Recommended Platforms:**
- Railway (easiest, one-click deploy)
- Render (free tier available)
- AWS EC2 (most control)
- Google Cloud Run (serverless)
- DigitalOcean App Platform

**Environment Variables:** Set all variables from `backend/.env`

**Startup Command:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Health Check Endpoint:** `/health`

### Frontend Deployment

**Status:** ✅ Ready for deployment

**Build Command:**
```bash
npm run build
```

**Output:** `dist/` directory (static files)

**Recommended Platforms:**
- Vercel (recommended for React)
- Netlify
- Cloudflare Pages
- AWS S3 + CloudFront

**Environment Variables:**
- `VITE_API_BASE_URL` - Backend API URL

**Build Output:** SPA with client-side routing
- Configure redirects: `/* → /index.html` (SPA routing)

### Database Deployment

**Status:** ✅ Running on Supabase

**Supabase Setup:**
1. Project created
2. pgvector extension enabled
3. Database schema deployed
4. Vector search function created

**Backup Strategy:** (Recommended for production)
- Supabase automatic backups (Pro plan)
- Manual exports via pg_dump
- Replication to secondary database

### Production Checklist

**Backend:**
- [ ] Change default admin password
- [ ] Generate strong SECRET_KEY
- [ ] Update ALLOWED_ORIGINS
- [ ] Enable HTTPS
- [ ] Set up error tracking (Sentry)
- [ ] Configure rate limits per use case
- [ ] Set up database backups
- [ ] Add health check monitoring
- [ ] Configure CORS for production domain
- [ ] Review and harden security settings

**Frontend:**
- [ ] Update API base URL
- [ ] Enable production build optimizations
- [ ] Configure CDN caching
- [ ] Set up analytics (Google Analytics, Plausible)
- [ ] Test mobile responsiveness
- [ ] Optimize images and assets
- [ ] Set up error boundary
- [ ] Configure CSP headers

**Infrastructure:**
- [ ] Set up SSL/TLS certificates
- [ ] Configure DNS
- [ ] Set up load balancing (if needed)
- [ ] Configure auto-scaling
- [ ] Set up CDN (CloudFront, Cloudflare)
- [ ] Implement DDoS protection
- [ ] Set up monitoring alerts

---

## Development Workflow

### Starting the Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
# Server runs on http://localhost:8000
# API docs at http://localhost:8000/docs
```

### Starting the Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Database Setup
```bash
cd backend
python scripts/init_db.py          # Create tables
python scripts/quick_create_admin.py  # Create default admin
python scripts/seed_knowledge_base.py  # Add sample data

# Run SQL migrations
psql < scripts/create_settings_table.sql
```

### Useful Commands

**Backend:**
```bash
# Run server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Create admin user
python scripts/quick_create_admin.py

# Format code
black app/

# Lint code
flake8 app/

# Type checking
mypy app/

# Test API
curl http://localhost:8000/health
```

**Frontend:**
```bash
# Development
npm run dev

# Build
npm run build

# Preview build
npm run preview

# Lint
npm run lint

# Type check
npx tsc --noEmit
```

---

## Team & Contributors

**Project:** Githaf Consulting Chatbot System
**Client:** Githaf Consulting (https://githafconsulting.com)
**Development:** Claude Code + Human Developer
**License:** MIT

---

## Resources & Links

- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **React Docs:** https://react.dev/
- **Vite Docs:** https://vite.dev/
- **Supabase Docs:** https://supabase.com/docs
- **Groq API:** https://console.groq.com/
- **i18next Docs:** https://www.i18next.com/
- **Framer Motion:** https://www.framer.com/motion/
- **Recharts:** https://recharts.org/
- **pgvector:** https://github.com/pgvector/pgvector
- **Sentence Transformers:** https://www.sbert.net/

---

**End of Documentation**

*This file is automatically updated with each significant change to the project.*
