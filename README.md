# Githaf Consulting Customer Service Chatbot

A RAG-based (Retrieval-Augmented Generation) customer service chatbot system with admin dashboard.

## 🎯 Features

### Chatbot
- ✅ Conversational AI powered by Llama 3.1 (via Groq)
- ✅ RAG pipeline with semantic search
- ✅ Context-aware responses
- ✅ Session management
- ✅ Feedback collection

### Admin Dashboard
- ✅ Analytics & metrics
- ✅ Knowledge base management
- ✅ Document upload (PDF, TXT, DOCX)
- ✅ URL scraping
- ✅ Conversation history
- ✅ Flagged queries review

## 🏗️ Architecture

```
┌─────────────────┐
│  React Frontend │
│   (Dashboard)   │
└────────┬────────┘
         │
         │ HTTP/REST
         │
┌────────▼────────┐
│  FastAPI Backend│
│   (Python)      │
└────────┬────────┘
         │
         ├──► Groq API (LLM)
         ├──► Sentence Transformers (Embeddings)
         └──► Supabase (PostgreSQL + pgvector)
```

## 📁 Project Structure

```
githaf-chatbot-system/
├── backend/          # Python FastAPI backend
│   ├── app/
│   │   ├── core/     # Config, database, security
│   │   ├── models/   # Pydantic schemas
│   │   ├── services/ # Business logic
│   │   ├── api/      # API routes
│   │   ├── utils/    # Utilities
│   │   └── middleware/
│   ├── scripts/      # DB setup & seeding
│   └── tests/
│
└── frontend/         # React frontend (TODO)
```

## 🚀 Quick Start

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Initialize database
python scripts/init_db.py
python scripts/seed_knowledge_base.py

# Run server
uvicorn app.main:app --reload
```

📖 **Detailed setup**: See [backend/SETUP.md](backend/SETUP.md)

## 🔧 Tech Stack

### Backend
- **Framework**: FastAPI
- **LLM**: Llama 3.1 (Groq API)
- **Embeddings**: Sentence Transformers
- **Vector DB**: Supabase (pgvector)
- **Orchestration**: LangChain

### Frontend (Coming Soon)
- **Framework**: React + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **State**: React Context
- **API**: Axios

## 📊 Database Schema

```sql
users            # Admin users
documents        # Knowledge base content
embeddings       # Vector embeddings (pgvector)
conversations    # Chat sessions
messages         # Individual messages
feedback         # User ratings
```

## 🔑 API Endpoints

### Public
- `POST /api/v1/chat/` - Chat with bot
- `POST /api/v1/feedback/` - Submit feedback

### Admin (Auth Required)
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/documents/` - List documents
- `POST /api/v1/documents/upload` - Upload file
- `GET /api/v1/analytics/` - Get metrics
- `GET /api/v1/conversations/` - View conversations

📚 **Full API docs**: http://localhost:8000/docs

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test chat
curl -X POST http://localhost:8000/api/v1/chat/ \
  -H "Content-Type: application/json" \
  -d '{"message": "What services do you offer?", "session_id": "test-123"}'
```

## 🚢 Deployment

### Backend
- **Recommended**: Railway, Render, or AWS EC2
- **Requirements**: Python 3.9+, 512MB RAM minimum

### Frontend
- **Recommended**: Vercel or Netlify

### Database
- **Managed**: Supabase (hosted)
- **Self-hosted**: PostgreSQL + pgvector extension

## 🛡️ Security

- ✅ JWT authentication for admin
- ✅ Rate limiting (10 req/min for chat)
- ✅ CORS configuration
- ✅ Input validation
- ✅ Supabase Row Level Security (RLS)

## 📈 Monitoring

- Health check: `GET /health`
- Logs: `backend/logs/app.log`
- Analytics: Admin dashboard

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Submit pull request

## 📝 License

MIT License - See LICENSE file

## 👥 Team

**Githaf Consulting**
- Website: https://githafconsulting.com
- Email: info@githafconsulting.com

## 🔮 Roadmap

- [x] Backend API
- [x] RAG pipeline
- [x] Database schema
- [ ] React frontend
- [ ] Admin dashboard UI
- [ ] Chatbot widget
- [ ] Deployment
- [ ] Multi-language support
- [ ] WhatsApp integration
