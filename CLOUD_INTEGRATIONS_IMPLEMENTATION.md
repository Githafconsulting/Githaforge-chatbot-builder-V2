# Cloud Integrations Feature - Complete Implementation Guide

**Status:** Phase 0 Complete (Foundation UI) ✅
**Created:** January 10, 2025
**Last Updated:** January 10, 2025

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Current Implementation Status](#current-implementation-status)
3. [User Journey](#user-journey)
4. [Architecture Overview](#architecture-overview)
5. [Database Schema](#database-schema)
6. [Backend Implementation](#backend-implementation)
7. [Frontend Implementation](#frontend-implementation)
8. [OAuth Integration Details](#oauth-integration-details)
9. [Implementation Phases](#implementation-phases)
10. [File Structure](#file-structure)
11. [API Endpoints](#api-endpoints)
12. [TypeScript Types](#typescript-types)
13. [Security Considerations](#security-considerations)
14. [Testing Strategy](#testing-strategy)
15. [Deployment Checklist](#deployment-checklist)

---

## Project Overview

### Purpose
Enable users to connect their cloud storage platforms (Google Drive, Microsoft 365, Dropbox, Confluence) and import documents directly into the chatbot's knowledge base without manual file downloads.

### Supported Platforms
1. **Google Drive** - Personal and business Google accounts
2. **Microsoft 365** - SharePoint, OneDrive, Teams
3. **Dropbox** - Personal and business accounts
4. **Confluence** - Atlassian Confluence pages

### Key Benefits
- ✅ One-click cloud account connection via OAuth 2.0
- ✅ Browse files directly from cloud storage
- ✅ Multi-file selection and batch import
- ✅ Automatic document processing and embedding generation
- ✅ No manual file downloads required
- ✅ Secure token-based authentication
- ✅ Ability to disconnect integrations anytime

---

## Current Implementation Status

### ✅ Phase 0: Foundation (COMPLETED - Jan 10, 2025)

#### Frontend Changes
1. **Created New Page:** `frontend/src/pages/admin/Integrations.tsx`
   - Cloud platform cards (Google Drive, Microsoft 365, Dropbox, Confluence)
   - "Coming Soon" banners with feature descriptions
   - Disabled "Connect" buttons (ready for Phase 1 activation)
   - Professional UI with Framer Motion animations
   - Responsive grid layout

2. **Updated Admin Sidebar:** `frontend/src/components/layout/AdminLayout.tsx`
   - Added `Cloud` icon import from lucide-react
   - New menu item: "Integrations" with sky-blue color theme
   - Positioned between "Chatbot Config" and "Widget Settings"

3. **Updated Router:** `frontend/src/App.tsx`
   - New route: `/admin/integrations` → `<IntegrationsPage />`
   - Protected route (requires authentication)

4. **Updated TypeScript Types:** `frontend/src/types/index.ts`
   - `IntegrationPlatform` type
   - `Integration` interface
   - `IntegrationConnection` interface
   - `CloudFile` interface
   - `ImportFilesRequest` interface

#### Backend Changes
- None yet (Phase 0 is UI-only)

#### Database Changes
- None yet (Phase 0 is UI-only)

---

## User Journey

### Scenario: Sarah (Marketing Manager) wants to add product documentation from Google Drive

#### Step 1: Navigate to Integrations
1. Sarah logs into admin dashboard (email + password)
2. Clicks **"Integrations"** in left sidebar
3. Sees 4 platform cards:
   - 📁 Google Drive (Not Connected)
   - 📊 Microsoft 365 (Not Connected)
   - 📦 Dropbox (Not Connected)
   - 📋 Confluence (Not Connected)

#### Step 2: Connect Google Drive
1. Clicks **"Connect Google Drive"** button
2. Popup window opens with Google OAuth consent screen
3. Logs in with `sarah@githafconsulting.com`
4. Google shows permission request:
   > "Githaf Chatbot wants to:
   > - View your Google Drive files
   > - Download files from your Drive"
5. Sarah clicks **"Allow"**
6. Popup closes automatically
7. Card updates:
   - ✅ **Connected**
   - Account: sarah@githafconsulting.com
   - Connected on: Jan 10, 2025
   - **"Disconnect"** button visible

#### Step 3: Import Files
1. Navigates to **Documents** page
2. Clicks **"Add from Cloud"** dropdown
3. Selects **"Import from Google Drive"**
4. Modal opens showing her Google Drive files:
   ```
   📁 Marketing Materials
   📁 Product Docs ← (clicks here)
   📄 Company Logo.png
   📄 Budget 2025.xlsx
   ```
5. Inside "Product Docs" folder, selects:
   - ✅ Product Overview.pdf
   - ✅ Feature Guide.docx
   - ✅ API Documentation.pdf
6. Selects category: **"Product Documentation"**
7. Clicks **"Import Files"**

#### Step 4: Import Progress
Modal shows real-time progress:
```
Importing files from Google Drive...

✓ Product Overview.pdf (Downloaded)
⏳ Feature Guide.docx (Processing...)
⏸ API Documentation.pdf (Waiting...)

Progress: 1 of 3 complete
```

After ~30 seconds:
```
✓ All files imported successfully!

✓ Product Overview.pdf (45 chunks created)
✓ Feature Guide.docx (32 chunks created)
✓ API Documentation.pdf (78 chunks created)

[Close]
```

#### Step 5: Verify & Test
1. Documents page refreshes showing 3 new documents
2. Each document shows:
   - Source: Google Drive
   - Category: Product Documentation
   - Chunk count, file size, date
3. Sarah tests chatbot: **"What are the main features of our product?"**
4. Bot responds with info from "Feature Guide.docx"
5. Shows source citation: "Source: Feature Guide.docx (Confidence: 92%)"

**Result:** ✅ Sarah successfully imported cloud files without downloading them!

---

## Architecture Overview

### High-Level Flow
```
User (Admin) → Frontend UI → Backend API → OAuth Provider → Backend → Supabase
                                           ↓
                                   Access Token Storage
                                           ↓
                              File Download & Processing
                                           ↓
                              Knowledge Base (Documents + Embeddings)
```

### Component Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React + TypeScript)                │
├─────────────────────────────────────────────────────────────────┤
│  Integrations Page          │  Documents Page                   │
│  - Platform cards           │  - "Import from Cloud" dropdown   │
│  - Connect/Disconnect       │  - File browser modal             │
│  - Status display           │  - Multi-select files             │
└────────────────┬────────────┴───────────────┬───────────────────┘
                 │                             │
                 │ REST API                    │ REST API
                 │                             │
┌────────────────▼────────────────────────────▼───────────────────┐
│                    Backend (FastAPI + Python)                   │
├─────────────────────────────────────────────────────────────────┤
│  /api/v1/integrations/*     │  /api/v1/documents/import         │
│  - OAuth flow handlers      │  - File import endpoint           │
│  - Token management         │  - Platform file download         │
│  - Connection status        │  - Document processing            │
└────────────┬─────────────────────────────────┬─────────────────┘
             │                                  │
             ├──► OAuth Providers               │
             │    - Google OAuth API            │
             │    - Microsoft Identity Platform │
             │    - Dropbox OAuth               │
             │    - Atlassian OAuth             │
             │                                  │
             └──► Supabase PostgreSQL           │
                  - user_integrations table     │
                  - access tokens (encrypted)   │
                                                 │
                                                 ▼
                        Document Processing Pipeline
                        (existing 3-layer architecture)
```

---

## Database Schema

### New Table: `user_integrations`

```sql
CREATE TABLE user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('google_drive', 'microsoft', 'dropbox', 'confluence')),

  -- OAuth Tokens
  access_token TEXT NOT NULL,           -- Encrypted
  refresh_token TEXT,                   -- Encrypted, optional
  token_expires_at TIMESTAMP WITH TIME ZONE,

  -- Account Info
  account_email TEXT,
  account_name TEXT,
  scopes TEXT[],                        -- Granted permissions

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, platform)             -- One connection per platform per user
);

-- Indexes
CREATE INDEX idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX idx_user_integrations_platform ON user_integrations(platform);
CREATE INDEX idx_user_integrations_expires ON user_integrations(token_expires_at);
```

### Token Encryption
Tokens will be encrypted before storage using **Fernet** (symmetric encryption):

```python
from cryptography.fernet import Fernet
import os

# Store key in environment variable
ENCRYPTION_KEY = os.getenv('INTEGRATION_ENCRYPTION_KEY')
cipher = Fernet(ENCRYPTION_KEY)

# Encrypt token
encrypted_token = cipher.encrypt(access_token.encode()).decode()

# Decrypt token
decrypted_token = cipher.decrypt(encrypted_token.encode()).decode()
```

---

## Backend Implementation

### File Structure
```
backend/
├── app/
│   ├── api/
│   │   └── routes/
│   │       └── integrations.py          # NEW: Integration API routes
│   │
│   ├── services/
│   │   ├── integration_service.py       # NEW: Integration business logic
│   │   └── cloud_file_downloader.py    # NEW: Platform-specific downloaders
│   │
│   ├── utils/
│   │   ├── oauth_providers.py           # NEW: OAuth provider configs
│   │   └── encryption.py                # NEW: Token encryption utilities
│   │
│   └── models/
│       └── integration.py               # NEW: Pydantic schemas
│
└── scripts/
    └── create_integrations_table.sql    # NEW: Database migration
```

### API Endpoints (Planned)

#### 1. List User Integrations
```http
GET /api/v1/integrations/
Authorization: Bearer <access_token>

Response 200:
{
  "integrations": [
    {
      "platform": "google_drive",
      "connected": true,
      "accountEmail": "user@example.com",
      "accountName": "John Doe",
      "connectedAt": "2025-01-10T10:30:00Z"
    },
    {
      "platform": "microsoft",
      "connected": false
    }
  ]
}
```

#### 2. Start OAuth Flow
```http
GET /api/v1/integrations/{platform}/connect
Authorization: Bearer <access_token>

Parameters:
- platform: google_drive | microsoft | dropbox | confluence

Response 302 (Redirect):
Location: https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&scope=...
```

#### 3. OAuth Callback
```http
GET /api/v1/integrations/{platform}/callback?code=AUTHORIZATION_CODE

Response 200:
{
  "success": true,
  "message": "Google Drive connected successfully",
  "integration": {
    "platform": "google_drive",
    "accountEmail": "user@example.com",
    "connectedAt": "2025-01-10T10:35:00Z"
  }
}
```

#### 4. Disconnect Integration
```http
DELETE /api/v1/integrations/{platform}
Authorization: Bearer <access_token>

Response 200:
{
  "success": true,
  "message": "Google Drive disconnected"
}
```

#### 5. Browse Files
```http
GET /api/v1/integrations/{platform}/files?folder_id=root
Authorization: Bearer <access_token>

Response 200:
{
  "files": [
    {
      "id": "1ABC123",
      "name": "Product Docs",
      "mimeType": "application/vnd.google-apps.folder",
      "isFolder": true,
      "modifiedTime": "2025-01-05T14:20:00Z"
    },
    {
      "id": "2DEF456",
      "name": "Overview.pdf",
      "mimeType": "application/pdf",
      "size": 2458932,
      "isFolder": false
    }
  ]
}
```

#### 6. Import Files from Cloud
```http
POST /api/v1/integrations/{platform}/import
Authorization: Bearer <access_token>
Content-Type: application/json

Body:
{
  "fileIds": ["2DEF456", "3GHI789"],
  "category": "Product Documentation"
}

Response 200:
{
  "success": true,
  "message": "2 files imported successfully",
  "documents": [
    {
      "id": "uuid-1",
      "title": "Overview.pdf",
      "source_type": "google_drive",
      "chunk_count": 45
    },
    {
      "id": "uuid-2",
      "title": "Guide.docx",
      "source_type": "google_drive",
      "chunk_count": 32
    }
  ]
}
```

---

## Frontend Implementation

### Components Created

#### 1. Integrations Page
**File:** `frontend/src/pages/admin/Integrations.tsx` (335 lines)

**Features:**
- Platform cards with connection status
- "Coming Soon" banner (Phase 0)
- Connect/Disconnect buttons
- Account information display
- Animated with Framer Motion
- Responsive grid layout

**UI Elements:**
- Header with Cloud icon
- Information banner explaining upcoming features
- 4 platform cards (2x2 grid on desktop, 1 column on mobile)
- Help section at bottom

#### 2. Updated Admin Layout
**File:** `frontend/src/components/layout/AdminLayout.tsx`

**Changes:**
- Line 20: Added `Cloud` import from lucide-react
- Line 47: Added Integrations menu item:
  ```tsx
  { path: '/admin/integrations', label: 'Integrations', icon: Cloud, color: 'text-sky-400' }
  ```

#### 3. Updated Router
**File:** `frontend/src/App.tsx`

**Changes:**
- Line 24: Added import for IntegrationsPage
- Line 70: Added route:
  ```tsx
  <Route path="integrations" element={<IntegrationsPage />} />
  ```

### Future Components (Phase 1+)

#### OAuth Popup Handler
```typescript
// frontend/src/utils/oauth.ts

export const openOAuthPopup = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      url,
      'oauth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Listen for callback
    window.addEventListener('message', (event) => {
      if (event.data.type === 'oauth_success') {
        popup?.close();
        resolve(event.data.code);
      } else if (event.data.type === 'oauth_error') {
        popup?.close();
        reject(new Error(event.data.error));
      }
    });
  });
};
```

#### File Browser Modal
```typescript
// frontend/src/components/integrations/FileBrowserModal.tsx

interface FileBrowserModalProps {
  platform: IntegrationPlatform;
  isOpen: boolean;
  onClose: () => void;
  onImport: (fileIds: string[], category?: string) => Promise<void>;
}

export const FileBrowserModal: React.FC<FileBrowserModalProps> = ({
  platform,
  isOpen,
  onClose,
  onImport
}) => {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [category, setCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Implementation details...
  // - Fetch files from platform
  // - Handle folder navigation
  // - Multi-select with checkboxes
  // - Import button with progress
};
```

---

## OAuth Integration Details

### 1. Google Drive Integration

#### Setup Requirements
1. Create project at https://console.cloud.google.com/
2. Enable Google Drive API
3. Create OAuth 2.0 credentials
4. Set redirect URI: `https://yourapp.com/api/v1/integrations/google_drive/callback`

#### Required Scopes
```python
GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',      # View files
    'https://www.googleapis.com/auth/drive.metadata.readonly'  # File metadata
]
```

#### OAuth Flow Implementation
```python
# backend/app/utils/oauth_providers.py

from google_auth_oauthlib.flow import Flow
import google.auth.transport.requests

class GoogleDriveOAuth:
    def __init__(self):
        self.client_id = os.getenv('GOOGLE_CLIENT_ID')
        self.client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        self.redirect_uri = f"{os.getenv('API_BASE_URL')}/api/v1/integrations/google_drive/callback"
        self.scopes = [
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/drive.metadata.readonly'
        ]

    def get_authorization_url(self) -> str:
        """Generate OAuth authorization URL"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=self.scopes,
            redirect_uri=self.redirect_uri
        )

        auth_url, state = flow.authorization_url(
            access_type='offline',  # Request refresh token
            include_granted_scopes='true',
            prompt='consent'
        )

        return auth_url

    def exchange_code_for_tokens(self, code: str) -> dict:
        """Exchange authorization code for access & refresh tokens"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=self.scopes,
            redirect_uri=self.redirect_uri
        )

        flow.fetch_token(code=code)
        credentials = flow.credentials

        return {
            'access_token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'expires_at': credentials.expiry.isoformat(),
            'scopes': credentials.scopes
        }

    def refresh_access_token(self, refresh_token: str) -> dict:
        """Refresh expired access token"""
        # Implementation using refresh token
        pass
```

#### File Download
```python
# backend/app/services/cloud_file_downloader.py

from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io

async def download_google_drive_file(file_id: str, access_token: str) -> tuple[bytes, str]:
    """
    Download file from Google Drive

    Returns:
        (file_content, file_name)
    """
    credentials = Credentials(token=access_token)
    service = build('drive', 'v3', credentials=credentials)

    # Get file metadata
    file_metadata = service.files().get(fileId=file_id, fields='name,mimeType').execute()
    file_name = file_metadata['name']
    mime_type = file_metadata['mimeType']

    # Download file content
    if 'google-apps' in mime_type:
        # Google Workspace file - export to appropriate format
        if 'document' in mime_type:
            export_mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        elif 'spreadsheet' in mime_type:
            export_mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        else:
            raise ValueError(f"Unsupported Google Workspace file type: {mime_type}")

        request = service.files().export_media(fileId=file_id, mimeType=export_mime)
    else:
        # Regular file
        request = service.files().get_media(fileId=file_id)

    file_buffer = io.BytesIO()
    downloader = MediaIoBaseDownload(file_buffer, request)

    done = False
    while not done:
        status, done = downloader.next_chunk()

    file_content = file_buffer.getvalue()

    return file_content, file_name
```

### 2. Microsoft 365 Integration

#### Setup Requirements
1. Register app at https://portal.azure.com/ → Azure AD → App registrations
2. Get: `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`
3. Set redirect URI: `https://yourapp.com/api/v1/integrations/microsoft/callback`

#### Required Scopes
```python
MICROSOFT_SCOPES = [
    'Files.Read.All',        # Read files in all site collections
    'Sites.Read.All',        # Read SharePoint sites
    'User.Read'              # Read user profile
]
```

#### OAuth Implementation
```python
import msal
import requests

class MicrosoftOAuth:
    def __init__(self):
        self.client_id = os.getenv('MICROSOFT_CLIENT_ID')
        self.client_secret = os.getenv('MICROSOFT_CLIENT_SECRET')
        self.tenant_id = os.getenv('MICROSOFT_TENANT_ID')
        self.redirect_uri = f"{os.getenv('API_BASE_URL')}/api/v1/integrations/microsoft/callback"
        self.authority = f"https://login.microsoftonline.com/{self.tenant_id}"
        self.scopes = ['Files.Read.All', 'Sites.Read.All', 'User.Read']

    def get_authorization_url(self) -> str:
        app = msal.ConfidentialClientApplication(
            self.client_id,
            authority=self.authority,
            client_credential=self.client_secret
        )

        auth_url = app.get_authorization_request_url(
            scopes=self.scopes,
            redirect_uri=self.redirect_uri
        )

        return auth_url

    def exchange_code_for_tokens(self, code: str) -> dict:
        app = msal.ConfidentialClientApplication(
            self.client_id,
            authority=self.authority,
            client_credential=self.client_secret
        )

        result = app.acquire_token_by_authorization_code(
            code,
            scopes=self.scopes,
            redirect_uri=self.redirect_uri
        )

        return {
            'access_token': result['access_token'],
            'refresh_token': result.get('refresh_token'),
            'expires_at': (datetime.now() + timedelta(seconds=result['expires_in'])).isoformat(),
            'scopes': result.get('scope', '').split(' ')
        }
```

#### File Download (SharePoint/OneDrive)
```python
async def download_microsoft_file(item_id: str, access_token: str, site_id: str = None) -> tuple[bytes, str]:
    """
    Download file from OneDrive or SharePoint

    Args:
        item_id: File ID
        access_token: Microsoft Graph access token
        site_id: SharePoint site ID (optional, None for OneDrive)
    """
    headers = {'Authorization': f'Bearer {access_token}'}

    if site_id:
        # SharePoint file
        url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive/items/{item_id}"
    else:
        # OneDrive file
        url = f"https://graph.microsoft.com/v1.0/me/drive/items/{item_id}"

    # Get file metadata
    response = requests.get(url, headers=headers)
    file_metadata = response.json()
    file_name = file_metadata['name']

    # Download content
    download_url = file_metadata['@microsoft.graph.downloadUrl']
    file_response = requests.get(download_url)
    file_content = file_response.content

    return file_content, file_name
```

### 3. Dropbox Integration

#### Setup Requirements
1. Create app at https://www.dropbox.com/developers/apps
2. Get: `APP_KEY`, `APP_SECRET`
3. Set redirect URI: `https://yourapp.com/api/v1/integrations/dropbox/callback`

#### OAuth Implementation
```python
import dropbox
from dropbox import DropboxOAuth2Flow

class DropboxOAuth:
    def __init__(self):
        self.app_key = os.getenv('DROPBOX_APP_KEY')
        self.app_secret = os.getenv('DROPBOX_APP_SECRET')
        self.redirect_uri = f"{os.getenv('API_BASE_URL')}/api/v1/integrations/dropbox/callback"

    def get_authorization_url(self) -> str:
        auth_flow = DropboxOAuth2Flow(
            consumer_key=self.app_key,
            consumer_secret=self.app_secret,
            redirect_uri=self.redirect_uri,
            session={},
            csrf_token_session_key='dropbox-auth-csrf-token'
        )

        return auth_flow.start()

    def exchange_code_for_tokens(self, code: str) -> dict:
        auth_flow = DropboxOAuth2Flow(
            consumer_key=self.app_key,
            consumer_secret=self.app_secret,
            redirect_uri=self.redirect_uri,
            session={},
            csrf_token_session_key='dropbox-auth-csrf-token'
        )

        result = auth_flow.finish(code)

        return {
            'access_token': result.access_token,
            'expires_at': None,  # Dropbox tokens don't expire
            'scopes': ['files.content.read']
        }
```

#### File Download
```python
async def download_dropbox_file(file_path: str, access_token: str) -> tuple[bytes, str]:
    """Download file from Dropbox"""
    dbx = dropbox.Dropbox(access_token)

    metadata, response = dbx.files_download(file_path)
    file_content = response.content
    file_name = metadata.name

    return file_content, file_name
```

### 4. Confluence Integration

#### Setup Requirements
1. Create app at https://developer.atlassian.com/console/myapps/
2. Get: `CLIENT_ID`, `CLIENT_SECRET`
3. Set callback URL: `https://yourapp.com/api/v1/integrations/confluence/callback`

#### OAuth Implementation
```python
import requests

class ConfluenceOAuth:
    def __init__(self):
        self.client_id = os.getenv('CONFLUENCE_CLIENT_ID')
        self.client_secret = os.getenv('CONFLUENCE_CLIENT_SECRET')
        self.redirect_uri = f"{os.getenv('API_BASE_URL')}/api/v1/integrations/confluence/callback"
        self.scopes = [
            'read:confluence-content.all',
            'read:confluence-space.summary'
        ]

    def get_authorization_url(self) -> str:
        params = {
            'audience': 'api.atlassian.com',
            'client_id': self.client_id,
            'scope': ' '.join(self.scopes),
            'redirect_uri': self.redirect_uri,
            'response_type': 'code',
            'prompt': 'consent'
        }

        url = 'https://auth.atlassian.com/authorize'
        query_string = '&'.join([f"{k}={v}" for k, v in params.items()])

        return f"{url}?{query_string}"

    def exchange_code_for_tokens(self, code: str) -> dict:
        data = {
            'grant_type': 'authorization_code',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'code': code,
            'redirect_uri': self.redirect_uri
        }

        response = requests.post('https://auth.atlassian.com/oauth/token', json=data)
        result = response.json()

        return {
            'access_token': result['access_token'],
            'refresh_token': result['refresh_token'],
            'expires_at': (datetime.now() + timedelta(seconds=result['expires_in'])).isoformat(),
            'scopes': result['scope'].split(' ')
        }
```

#### Content Download (Confluence Pages)
```python
async def download_confluence_page(page_id: str, access_token: str, cloud_id: str) -> tuple[str, str]:
    """
    Download Confluence page content

    Returns:
        (text_content, page_title)
    """
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Accept': 'application/json'
    }

    url = f"https://api.atlassian.com/ex/confluence/{cloud_id}/rest/api/content/{page_id}"
    params = {'expand': 'body.storage'}

    response = requests.get(url, headers=headers, params=params)
    page_data = response.json()

    title = page_data['title']
    html_content = page_data['body']['storage']['value']

    # Convert HTML to plain text
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')
    text_content = soup.get_text(separator='\n', strip=True)

    return text_content, title
```

---

## Implementation Phases

### Phase 0: Foundation ✅ COMPLETE
**Duration:** 2-3 hours
**Status:** Completed Jan 10, 2025

**Deliverables:**
- [x] Integrations page UI with platform cards
- [x] "Coming Soon" banners
- [x] Sidebar menu item
- [x] Router configuration
- [x] TypeScript type definitions

**Files Modified:**
- `frontend/src/pages/admin/Integrations.tsx` (created)
- `frontend/src/components/layout/AdminLayout.tsx` (modified)
- `frontend/src/App.tsx` (modified)
- `frontend/src/types/index.ts` (modified)

---

### Phase 1: Google Drive (Full Implementation)
**Duration:** 12-16 hours
**Priority:** High

**Backend Tasks:**
- [ ] Create `user_integrations` database table
- [ ] Create `backend/app/utils/encryption.py` for token encryption
- [ ] Create `backend/app/utils/oauth_providers.py` with GoogleDriveOAuth class
- [ ] Create `backend/app/services/integration_service.py`:
  - [ ] `create_integration(user_id, platform, tokens)`
  - [ ] `get_user_integrations(user_id)`
  - [ ] `delete_integration(user_id, platform)`
  - [ ] `refresh_token_if_expired(integration_id)`
- [ ] Create `backend/app/services/cloud_file_downloader.py`:
  - [ ] `download_google_drive_file(file_id, access_token)`
  - [ ] `list_google_drive_files(folder_id, access_token)`
- [ ] Create `backend/app/api/routes/integrations.py`:
  - [ ] `GET /integrations/` - List user's integrations
  - [ ] `GET /integrations/google_drive/connect` - Start OAuth
  - [ ] `GET /integrations/google_drive/callback` - Handle callback
  - [ ] `DELETE /integrations/google_drive` - Disconnect
  - [ ] `GET /integrations/google_drive/files` - Browse files
  - [ ] `POST /integrations/google_drive/import` - Import files
- [ ] Register router in `backend/app/api/v1.py`
- [ ] Add environment variables to `.env`:
  ```
  GOOGLE_CLIENT_ID=your_client_id
  GOOGLE_CLIENT_SECRET=your_client_secret
  INTEGRATION_ENCRYPTION_KEY=generate_with_fernet
  ```
- [ ] Install dependencies:
  ```bash
  pip install google-auth google-auth-oauthlib google-api-python-client cryptography
  ```

**Frontend Tasks:**
- [ ] Update `Integrations.tsx`:
  - [ ] Remove "Coming Soon" badge for Google Drive
  - [ ] Enable "Connect" button
  - [ ] Implement `handleConnect()` function
  - [ ] Implement `handleDisconnect()` function
  - [ ] Load real connection status from API
- [ ] Create `frontend/src/utils/oauth.ts` - OAuth popup handler
- [ ] Create `frontend/src/components/integrations/FileBrowserModal.tsx`:
  - [ ] File/folder listing
  - [ ] Breadcrumb navigation
  - [ ] Multi-select with checkboxes
  - [ ] Import button with progress
- [ ] Update `frontend/src/services/api.ts`:
  - [ ] `getIntegrations()`
  - [ ] `connectIntegration(platform)`
  - [ ] `disconnectIntegration(platform)`
  - [ ] `getCloudFiles(platform, folderId)`
  - [ ] `importFromCloud(platform, fileIds, category)`
- [ ] Update Documents page:
  - [ ] Add "Import from Cloud" dropdown
  - [ ] Show FileBrowserModal when selected

**Testing:**
- [ ] Test OAuth flow end-to-end
- [ ] Test file browsing and navigation
- [ ] Test multi-file import
- [ ] Test token refresh mechanism
- [ ] Test disconnection flow

---

### Phase 2: Microsoft 365 (SharePoint/OneDrive/Teams)
**Duration:** 10-14 hours
**Priority:** High

**Backend Tasks:**
- [ ] Create `MicrosoftOAuth` class in `oauth_providers.py`
- [ ] Implement Microsoft Graph API file download
- [ ] Add SharePoint site listing
- [ ] Handle OneDrive vs SharePoint file paths
- [ ] Install dependency:
  ```bash
  pip install msal
  ```
- [ ] Add environment variables:
  ```
  MICROSOFT_CLIENT_ID=your_app_id
  MICROSOFT_CLIENT_SECRET=your_app_secret
  MICROSOFT_TENANT_ID=your_tenant_id
  ```

**Frontend Tasks:**
- [ ] Update `Integrations.tsx` - enable Microsoft 365 card
- [ ] Add SharePoint site selector to file browser
- [ ] Handle OneDrive vs SharePoint file sources

**Testing:**
- [ ] Test with personal Microsoft account
- [ ] Test with business Microsoft 365 account
- [ ] Test SharePoint site access
- [ ] Test OneDrive file access

---

### Phase 3: Dropbox
**Duration:** 8-10 hours
**Priority:** Medium

**Backend Tasks:**
- [ ] Create `DropboxOAuth` class
- [ ] Implement Dropbox file download
- [ ] Install dependency:
  ```bash
  pip install dropbox
  ```
- [ ] Add environment variables:
  ```
  DROPBOX_APP_KEY=your_app_key
  DROPBOX_APP_SECRET=your_app_secret
  ```

**Frontend Tasks:**
- [ ] Enable Dropbox card in Integrations page
- [ ] Add Dropbox file browser support

**Testing:**
- [ ] Test with personal Dropbox
- [ ] Test with Dropbox Business

---

### Phase 4: Confluence
**Duration:** 8-10 hours
**Priority:** Medium

**Backend Tasks:**
- [ ] Create `ConfluenceOAuth` class
- [ ] Implement Confluence page content extraction
- [ ] Add Confluence space listing
- [ ] Handle HTML to text conversion
- [ ] Add environment variables:
  ```
  CONFLUENCE_CLIENT_ID=your_client_id
  CONFLUENCE_CLIENT_SECRET=your_client_secret
  ```

**Frontend Tasks:**
- [ ] Enable Confluence card
- [ ] Add Confluence space/page browser

**Testing:**
- [ ] Test with Confluence Cloud
- [ ] Test page content extraction
- [ ] Test nested page hierarchies

---

### Phase 5: Polish & Production
**Duration:** 6-8 hours
**Priority:** High

**Tasks:**
- [ ] Add comprehensive error handling
- [ ] Implement retry logic for failed downloads
- [ ] Add progress indicators for large file batches
- [ ] Create user documentation
- [ ] Add admin notification for failed imports
- [ ] Implement audit logging for all OAuth actions
- [ ] Security audit:
  - [ ] Token encryption verification
  - [ ] OAuth redirect URI validation
  - [ ] CSRF protection
  - [ ] Rate limiting on import endpoints
- [ ] Performance optimization:
  - [ ] Batch file downloads
  - [ ] Parallel processing
  - [ ] Connection pooling
- [ ] Monitoring:
  - [ ] OAuth success/failure rates
  - [ ] Token refresh success rates
  - [ ] File import success rates
  - [ ] Average import time per file

---

## TypeScript Types

All types defined in `frontend/src/types/index.ts`:

```typescript
// Cloud Integration Types
export type IntegrationPlatform = 'google_drive' | 'microsoft' | 'dropbox' | 'confluence';

export interface Integration {
  id: string;
  user_id: string;
  platform: IntegrationPlatform;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  account_email?: string;
  account_name?: string;
  scopes?: string[];
  connected_at: string;
  updated_at: string;
}

export interface IntegrationConnection {
  platform: IntegrationPlatform;
  connected: boolean;
  accountEmail?: string;
  accountName?: string;
  connectedAt?: string;
}

export interface CloudFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
  webViewLink?: string;
  isFolder?: boolean;
  parentId?: string;
}

export interface ImportFilesRequest {
  platform: IntegrationPlatform;
  fileIds: string[];
  category?: string;
}
```

---

## Security Considerations

### 1. Token Storage
- **Encryption:** All access tokens encrypted with Fernet before database storage
- **Key Management:** Encryption key stored in environment variable, never in code
- **Rotation:** Implement key rotation strategy for production
- **Scope Limitation:** Request minimal OAuth scopes required

### 2. OAuth Security
- **CSRF Protection:** Implement state parameter validation
- **Redirect URI Validation:** Whitelist exact redirect URIs
- **Token Expiry:** Automatic token refresh before expiration
- **Revocation:** Users can disconnect integrations anytime

### 3. API Security
- **Authentication Required:** All integration endpoints require valid JWT
- **User Isolation:** Users can only access their own integrations
- **Rate Limiting:** Prevent abuse of OAuth endpoints
- **Audit Logging:** Log all OAuth grants, revocations, and file imports

### 4. Data Privacy
- **No File Caching:** Files downloaded directly to processing pipeline, not stored
- **Account Info:** Only store necessary account metadata (email, name)
- **User Control:** Clear UI for viewing and revoking connected accounts

---

## Testing Strategy

### Unit Tests
```python
# backend/tests/test_oauth_providers.py

def test_google_drive_oauth_url_generation():
    oauth = GoogleDriveOAuth()
    url = oauth.get_authorization_url()

    assert 'accounts.google.com' in url
    assert 'client_id' in url
    assert 'redirect_uri' in url
    assert 'scope' in url

def test_token_encryption():
    from app.utils.encryption import encrypt_token, decrypt_token

    original_token = 'test_access_token_123'
    encrypted = encrypt_token(original_token)
    decrypted = decrypt_token(encrypted)

    assert decrypted == original_token
    assert encrypted != original_token
```

### Integration Tests
```python
# backend/tests/test_integrations_api.py

@pytest.mark.asyncio
async def test_list_integrations(client, auth_headers):
    response = await client.get('/api/v1/integrations/', headers=auth_headers)

    assert response.status_code == 200
    assert 'integrations' in response.json()

@pytest.mark.asyncio
async def test_oauth_callback(client, mock_google_oauth):
    response = await client.get('/api/v1/integrations/google_drive/callback?code=test_code')

    assert response.status_code == 200
    assert response.json()['success'] == True
```

### E2E Tests
```typescript
// frontend/e2e/integrations.spec.ts

describe('Cloud Integrations', () => {
  it('should connect Google Drive account', async () => {
    await page.goto('/admin/integrations');
    await page.click('text=Connect Google Drive');

    // Mock OAuth popup
    await page.waitForSelector('text=Connected');

    const accountEmail = await page.textContent('.account-email');
    expect(accountEmail).toBe('test@example.com');
  });

  it('should import files from Google Drive', async () => {
    await page.goto('/admin/documents');
    await page.click('text=Import from Google Drive');

    await page.check('input[type="checkbox"][value="file-123"]');
    await page.click('text=Import Files');

    await page.waitForSelector('text=imported successfully');
  });
});
```

---

## Deployment Checklist

### Prerequisites
- [ ] Google Cloud project with OAuth credentials
- [ ] Azure AD app registration (for Microsoft 365)
- [ ] Dropbox app created
- [ ] Confluence app created
- [ ] Encryption key generated: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`

### Environment Variables (Production)
```bash
# Google Drive
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret

# Microsoft 365
MICROSOFT_CLIENT_ID=your_app_id
MICROSOFT_CLIENT_SECRET=your_app_secret
MICROSOFT_TENANT_ID=your_tenant_id

# Dropbox
DROPBOX_APP_KEY=your_app_key
DROPBOX_APP_SECRET=your_app_secret

# Confluence
CONFLUENCE_CLIENT_ID=your_client_id
CONFLUENCE_CLIENT_SECRET=your_client_secret

# Encryption
INTEGRATION_ENCRYPTION_KEY=your_generated_fernet_key

# API Base URL
API_BASE_URL=https://api.yourapp.com
```

### OAuth Configuration
- [ ] Add production redirect URIs to all OAuth apps:
  - Google: `https://api.yourapp.com/api/v1/integrations/google_drive/callback`
  - Microsoft: `https://api.yourapp.com/api/v1/integrations/microsoft/callback`
  - Dropbox: `https://api.yourapp.com/api/v1/integrations/dropbox/callback`
  - Confluence: `https://api.yourapp.com/api/v1/integrations/confluence/callback`

### Database Migration
```bash
# Run migration script
psql $DATABASE_URL < backend/scripts/create_integrations_table.sql
```

### Dependency Installation
```bash
cd backend
pip install google-auth google-auth-oauthlib google-api-python-client msal dropbox cryptography
```

### Frontend Build
```bash
cd frontend
npm run build
# Deploy dist/ to Netlify/Vercel
```

### Post-Deployment Verification
- [ ] Test OAuth flow for each platform
- [ ] Verify token encryption/decryption
- [ ] Test file import end-to-end
- [ ] Monitor error logs for OAuth failures
- [ ] Set up alerts for token refresh failures

---

## Effort Estimates

### Total Implementation Time

| Phase | Backend | Frontend | Testing | Total |
|-------|---------|----------|---------|-------|
| Phase 0 (Foundation) | 0h | 3h | 0h | **3h** ✅ |
| Phase 1 (Google Drive) | 8h | 6h | 2h | **16h** |
| Phase 2 (Microsoft 365) | 7h | 4h | 2h | **13h** |
| Phase 3 (Dropbox) | 5h | 3h | 2h | **10h** |
| Phase 4 (Confluence) | 5h | 3h | 2h | **10h** |
| Phase 5 (Polish) | 4h | 3h | 2h | **9h** |
| **TOTAL** | **29h** | **22h** | **10h** | **61h** |

**Approximate Calendar Time:**
- **With 1 developer working full-time:** 8-10 business days
- **With 2 developers (1 backend, 1 frontend):** 4-5 business days

---

## Current Status Summary

### ✅ Completed (Phase 0)
1. Frontend Integrations page UI
2. Sidebar navigation menu item
3. Router configuration
4. TypeScript type definitions
5. "Coming Soon" user messaging

### 🚧 Next Steps (Phase 1 - Google Drive)
1. Create database migration for `user_integrations` table
2. Set up Google Cloud OAuth credentials
3. Implement backend OAuth flow
4. Implement file browser modal
5. Test end-to-end integration

### 📝 Future Enhancements (Post-MVP)
- Automatic sync: Re-import files when they change in cloud storage
- Webhook support: Real-time updates when files are modified
- Shared folder support: Import entire folders recursively
- Team permissions: Allow team admins to connect org-wide integrations
- File preview: Show file previews before importing
- Duplicate detection: Warn if file already exists in knowledge base

---

## Support & Documentation

### For Developers
- **This document** - Complete implementation guide
- `CLAUDE.md` - Main project documentation
- API documentation: `http://localhost:8000/docs` (Swagger UI)

### For End Users
- User guide will be created after Phase 1 completion
- Video tutorials planned for each platform
- FAQ section in admin dashboard

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| Jan 10, 2025 | 1.0.0 | Initial documentation created after Phase 0 completion |

---

**Last Updated:** January 10, 2025
**Document Version:** 1.0.0
**Maintainer:** Development Team