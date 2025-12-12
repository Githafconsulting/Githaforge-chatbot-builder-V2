# 🚀 Githaf Chatbot Builder V2 - Quick Start Guide

**Get the application running in under 10 minutes**

---

## 📋 Prerequisites

Before starting, ensure you have:

- **Python 3.9+** installed
- **Node.js 18+** and npm installed
- **Git** installed
- **Supabase account** (free tier works)
- **Groq API key** (free tier: 14,400 requests/day)

---

## 🔧 Step 1: Clone the Repository

```bash
git clone https://github.com/Githafconsulting/Githaforge-chatbot-builder-V2.git
cd Githaforge-chatbot-builder-V2
```

---

## 🗄️ Step 2: Set Up Supabase Database

### 2.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for database provisioning (~2 minutes)

### 2.2 Enable pgvector Extension
1. In Supabase dashboard, go to **SQL Editor**
2. Run this command:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2.3 Initialize Database Schema
1. Copy all SQL from `backend/scripts/database_schema.sql`
2. Paste and run in Supabase SQL Editor
3. Copy and run `backend/scripts/vector_search_function.sql`
4. Copy and run `backend/scripts/create_settings_table.sql`

### 2.4 Get Credentials
- **Project URL:** Settings → API → Project URL
- **Anon Key:** Settings → API → Project API keys → anon/public

---

## 🔑 Step 3: Get Groq API Key

1. Visit [console.groq.com](https://console.groq.com)
2. Sign up/login (free account)
3. Go to **API Keys** section
4. Click **Create API Key**
5. Copy the key (starts with `gsk_...`)

---

## ⚙️ Step 4: Configure Backend

### 4.1 Create Environment File
```bash
cd backend
cp .env.example .env
```

### 4.2 Edit `.env` File
Open `backend/.env` and update these values:

```bash
# Supabase (from Step 2.4)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Groq API (from Step 3)
GROQ_API_KEY=gsk_your_groq_api_key

# Security (generate new key)
SECRET_KEY=your-secret-key-here  # Generate with: openssl rand -hex 32

# Leave other settings as default for now
```

### 4.3 Install Dependencies

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements-dev.txt (development)
pip install -r requirements.txt (production)
```

**Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4.4 Create Admin User
```bash
python scripts/quick_create_admin.py
```

**Default credentials created:**
- Email: `admin@githaf.com`
- Password: `admin123`

> ⚠️ **Important:** Change this password after first login in production!

---

## 🎨 Step 5: Configure Frontend

### 5.1 Create Environment File
```bash
cd ../frontend
cp .env.example .env
```

### 5.2 Edit `.env` File
```bash
VITE_API_BASE_URL=http://localhost:8000
```

### 5.3 Install Dependencies
```bash
npm install
```

---

## 🚀 Step 6: Start the Application

### 6.1 Start Backend (Terminal 1)
```bash
cd backend
# Activate venv if not already active
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

uvicorn app.main:app --reload
```

**Expected output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### 6.2 Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

**Expected output:**
```
  VITE v7.1.7  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## ✅ Step 7: Verify Installation

### 7.1 Check Backend Health
Open browser: http://localhost:8000/health

**Expected response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected"
}
```

### 7.2 Check API Documentation
Open browser: http://localhost:8000/docs

You should see interactive Swagger UI with all endpoints.

### 7.3 Access Frontend
Open browser: http://localhost:5173/

You should see the landing page with the chat widget.

### 7.4 Login to Admin Dashboard
1. Go to http://localhost:5173/login
2. Login with:
   - Email: `admin@githaf.com`
   - Password: `admin123`
3. You should be redirected to http://localhost:5173/admin (Analytics page)

---

## 📚 Step 8: Add Knowledge Base (Optional)

### Option A: Upload Sample Documents
1. Go to **Documents** page in admin dashboard
2. Click **Upload Document**
3. Select a PDF, DOCX, or TXT file
4. Click **Upload**

### Option B: Scrape a URL
1. Go to **Documents** page
2. Click **Add from URL**
3. Enter a URL (e.g., your company website)
4. Click **Scrape**

### Option C: Use Seed Script
```bash
cd backend
python scripts/seed_knowledge_base.py
```

This adds sample documents about Githaf Consulting.

---

## 🧪 Step 9: Test the Chatbot

### 9.1 Test on Landing Page
1. Go to http://localhost:5173/
2. Click the chat widget in bottom-right corner
3. Type: "What services do you offer?"
4. You should get a response based on your knowledge base

### 9.2 Test Various Queries
Try these to test different features:

**Conversational:**
- "Hello"
- "Thank you"
- "How are you?"

**Knowledge-based:**
- "What does Githaf Consulting do?"
- "Tell me about your services"

**Out of scope:**
- "What's the weather today?"
- "Who is the president?"

### 9.3 Test Feedback
- Click thumbs up/down on responses
- Check **Flagged Queries** page for thumbs-down feedback

---

## 🎯 Common Issues & Solutions

### Issue: Backend fails to start
**Error:** `ModuleNotFoundError: No module named 'fastapi'`
**Solution:** Ensure virtual environment is activated and dependencies installed:
```bash
pip install -r requirements.txt
```

### Issue: Database connection error
**Error:** `Error connecting to Supabase`
**Solution:**
- Verify `SUPABASE_URL` and `SUPABASE_KEY` in `.env`
- Check Supabase project is active
- Ensure database schema is initialized

### Issue: Chat returns errors
**Error:** `Context not found` or `No response`
**Solution:**
- Add documents to knowledge base (Step 8)
- Check Groq API key is valid
- Verify embedding model downloaded (~100MB, auto-downloads on first use)

### Issue: Frontend can't connect to backend
**Error:** `Network Error` in browser console
**Solution:**
- Ensure backend is running on port 8000
- Check `VITE_API_BASE_URL` in `frontend/.env`
- Verify CORS settings in `backend/app/middleware/cors.py`

### Issue: Port already in use
**Error:** `Address already in use`
**Solution:**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:8000 | xargs kill -9
```

---

## 📊 Application Structure

```
http://localhost:5173/              → Landing page with chat widget
http://localhost:5173/login         → Admin login
http://localhost:5173/admin         → Analytics dashboard
http://localhost:5173/admin/documents      → Knowledge base manager
http://localhost:5173/admin/conversations  → Chat history
http://localhost:5173/admin/flagged        → Low-rated queries
http://localhost:5173/admin/users          → User management
http://localhost:5173/admin/widget         → Widget customization
http://localhost:5173/admin/settings       → System settings

http://localhost:8000/docs          → API documentation (Swagger)
http://localhost:8000/health        → Health check endpoint
```

---

## 🔒 Security Checklist (Before Production)

- [ ] Change default admin password
- [ ] Generate strong `SECRET_KEY` in backend `.env`
- [ ] Update `ALLOWED_ORIGINS` for production domain
- [ ] Enable HTTPS/SSL
- [ ] Review rate limits in `backend/app/middleware/rate_limiter.py`
- [ ] Set up database backups
- [ ] Configure error monitoring (Sentry)
- [ ] Review privacy settings (IP anonymization)

---

## 📖 Next Steps

- **Read full documentation:** [CLAUDE.md](./CLAUDE.md)
- **Deploy to production:** See deployment section in CLAUDE.md
- **Customize chat widget:** Admin → Widget Settings
- **Add more languages:** System Settings → Language Settings
- **Monitor analytics:** Admin → Analytics

---

## 🆘 Getting Help

- **Documentation:** [CLAUDE.md](./CLAUDE.md)
- **Issues:** [GitHub Issues](https://github.com/Githafconsulting/Githaforge-chatbot-builder-V2/issues)
- **API Docs:** http://localhost:8000/docs

---

**🎉 Congratulations! Your chatbot is now running!**

**Total setup time:** ~10 minutes (excluding downloads)


-------------------------------------------------------------------------------------------
# running ngrok: 

# Account1: 
ngrok http 5173 --config C:\ngrok-configs\ngrok-account1.yml --log=stdout --log-level=info --web-port=4040

# or
ngrok http 5173 --config C:\ngrok-configs\ngrok-account1.yml
------------------------------------------------------------------------------------------
# Account2: 
ngrok http 8000 --config C:\ngrok-configs\ngrok-account2.yml --log=stdout --log-level=info --web-port=4041

# or
ngrok http 8000 --config C:\ngrok-configs\ngrok-account2.yml

-----------------------------------------------------------------------------------------------

# Cloudflare Tunnel Setup
1. Download cloudflared:
Go to: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
Or use: winget install cloudflare.cloudflared
2. Run tunnels for both services:

# Terminal 1 - Frontend (port 5173)
cloudflared tunnel --url http://localhost:5173

# Terminal 2 - Backend (port 8000)
cloudflared tunnel --url http://localhost:8000

3. Get the URLs - Cloudflare will output URLs like:
https://something-random.trycloudflare.com (frontend)
https://another-random.trycloudflare.com (backend)
4. Update the client's layout.tsx with those URLs
Let me know once you have the Cloudflare tunnel URLs and I can help update the client code.