# Githaf Consulting Chatbot - Frontend

React + TypeScript frontend for the Githaf Consulting customer service chatbot system.

## 🎯 Features

### Customer-Facing
- **Chat Widget**: Conversational interface with RAG-powered responses
- **Session Management**: Persistent chat sessions
- **Feedback System**: Thumbs up/down ratings
- **Source Attribution**: View sources for bot responses

### Admin Dashboard
- **Analytics**: Overview metrics, trending queries, satisfaction scores
- **Knowledge Base**: Upload documents (PDF/TXT/DOCX) or scrape URLs
- **Conversations**: View all customer interactions
- **Flagged Queries**: Review low-rated responses for improvement

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Icons**: Lucide React

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── chat/
│   │   │   └── ChatWidget.tsx         # Customer chat interface
│   │   └── layout/
│   │       ├── AdminLayout.tsx        # Admin dashboard layout
│   │       └── ProtectedRoute.tsx     # Auth route guard
│   ├── pages/
│   │   ├── Home.tsx                   # Landing page
│   │   ├── Login.tsx                  # Admin login
│   │   └── admin/
│   │       ├── Analytics.tsx          # Analytics dashboard
│   │       ├── Documents.tsx          # Knowledge base management
│   │       ├── Conversations.tsx      # Chat history
│   │       └── Flagged.tsx           # Flagged queries review
│   ├── contexts/
│   │   └── AuthContext.tsx           # Authentication state
│   ├── services/
│   │   └── api.ts                    # API client
│   ├── types/
│   │   └── index.ts                  # TypeScript types
│   ├── utils/
│   │   └── session.ts                # Session management
│   ├── App.tsx                       # Main app component
│   └── main.tsx                      # Entry point
├── .env.example                      # Environment variables template
├── tailwind.config.js                # Tailwind configuration
├── tsconfig.json                     # TypeScript configuration
└── package.json                      # Dependencies
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Backend API running on `http://localhost:8000`

### Installation

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Environment Variables

Create a `.env` file:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## 📝 Usage

### Customer Interface

1. Visit `http://localhost:5173`
2. Click the chat icon in the bottom right
3. Start asking questions
4. Rate responses with thumbs up/down

### Admin Dashboard

1. Navigate to `http://localhost:5173/login`
2. Login with admin credentials
3. Access features:
   - **Analytics** (`/admin`) - View metrics and trends
   - **Knowledge Base** (`/admin/documents`) - Manage documents
   - **Conversations** (`/admin/conversations`) - View chat history
   - **Flagged Queries** (`/admin/flagged`) - Review low-rated responses

## 🔌 API Integration

All API calls are handled through the `apiService` in `src/services/api.ts`:

### Public APIs
- `sendMessage(message, sessionId)` - Send chat message
- `submitFeedback(messageId, rating, comment)` - Submit feedback

### Admin APIs (Auth Required)
- `login(username, password)` - Admin login
- `getDocuments()` - List documents
- `uploadDocument(file)` - Upload file
- `addDocumentFromUrl(url)` - Scrape URL
- `deleteDocument(id)` - Delete document
- `getConversations()` - List conversations
- `getConversation(id)` - Get conversation details
- `getAnalytics()` - Get analytics data
- `getFlaggedQueries()` - Get flagged queries

## 🔐 Authentication

- JWT tokens stored in `localStorage`
- Auto-redirect to login on 401 responses
- Protected routes require authentication
- Token included in request headers automatically

## 🎨 Styling

Uses Tailwind CSS for utility-first styling:

- Responsive design (mobile-friendly)
- Custom color scheme
- Component-based classes

## 📦 Build & Deploy

### Production Build

```bash
npm run build
```

Output in `dist/` directory

### Preview Production Build

```bash
npm run preview
```

### Deployment

Recommended platforms:
- **Vercel**: `vercel deploy`
- **Netlify**: Connect GitHub repo
- **AWS S3 + CloudFront**: Upload `dist/` folder

Update `VITE_API_BASE_URL` for production backend.

## 🧪 Development

### Available Scripts

```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

## 🐛 Troubleshooting

### CORS Errors
Ensure backend is configured with frontend URL in CORS allowed origins:
```python
ALLOWED_ORIGINS = '["http://localhost:5173"]'
```

### API Connection Failed
- Check backend is running on correct port
- Verify `VITE_API_BASE_URL` in `.env`
- Check network tab in browser DevTools

### Authentication Issues
- Clear localStorage: `localStorage.clear()`
- Check token in DevTools → Application → Local Storage
- Verify backend auth endpoint is working

## 📄 License

MIT License

## 👥 Support

For issues or questions:
- Email: info@githafconsulting.com
- Backend API Docs: http://localhost:8000/docs
