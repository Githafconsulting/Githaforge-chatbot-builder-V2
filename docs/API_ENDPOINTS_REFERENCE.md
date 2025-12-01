# API Endpoints Reference - Multitenancy Implementation

**Project:** Githaforge Chatbot Builder V2
**Version:** 2.0.0 (Multitenancy)
**Base URL:** `http://localhost:8000/api/v1`
**Date:** January 27, 2025

---

## 📋 Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [Company Endpoints](#company-endpoints)
3. [Chatbot Endpoints](#chatbot-endpoints)
4. [Super Admin Endpoints](#super-admin-endpoints)
5. [Document Endpoints](#document-endpoints)
6. [Analytics Endpoints](#analytics-endpoints)

---

## 🔐 Authentication Endpoints

### 1. Company User Login

**Endpoint:** `POST /api/v1/auth/login`
**Authentication:** None (public)
**Description:** Login for company users (owners, admins, team members)

**Request Body (form-data):**
```
username=user@example.com
password=userpassword
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**JWT Payload:**
```json
{
  "sub": "user_id",
  "company_id": "company_uuid",
  "role": "owner|admin|editor|trainer|analyst|viewer",
  "exp": 1706380800
}
```

**Error Responses:**
- `401`: Incorrect username or password
- `403`: User account is inactive

---

### 2. Company Signup

**Endpoint:** `POST /api/v1/auth/signup`
**Authentication:** None (public)
**Status Code:** `201 Created`
**Description:** Register new company and create owner user

**Request Body (JSON):**
```json
{
  "company_name": "Acme Corporation",
  "email": "owner@acme.com",
  "password": "securepassword",
  "full_name": "John Doe",
  "website": "https://acme.com",
  "industry": "Technology",
  "company_size": "11-50"
}
```

**Required Fields:**
- `company_name` (2-100 chars)
- `email` (valid email)
- `password` (min 8 chars)
- `full_name` (min 2 chars)

**Optional Fields:**
- `website`
- `industry`
- `company_size`

**Response (201):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "company_id": "35816f68-d848-40ff-9b29-349a07632052",
  "user_id": "ae6a4f8e-5705-4294-9929-75a5ce12666c",
  "message": "Company 'Acme Corporation' registered successfully"
}
```

**What Gets Created:**
1. Company with `plan: "free"`, `is_active: true`
2. Owner user with `is_admin: true`, `is_active: true`
3. Owner role assignment (17 permissions)
4. JWT token for immediate login

**Error Responses:**
- `400`: Email already registered
- `400`: Company name already taken
- `500`: Failed to create company
- `500`: Failed to create user account

---

### 3. Super Admin Login

**Endpoint:** `POST /api/v1/auth/super-admin-login`
**Authentication:** None (public)
**Description:** Login for Githaf platform super admins

**Request Body (form-data):**
```
username=superadmin@githaf.com
password=superadminpassword
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**JWT Payload:**
```json
{
  "sub": "user_id",
  "company_id": null,
  "role": "super_admin",
  "is_super_admin": true,
  "exp": 1706380800
}
```

**Super Admin Characteristics:**
- `company_id = NULL` (not tied to any company)
- `is_super_admin = true` (bypasses RLS)
- Access to all companies and data
- Cannot be created via signup

**Error Responses:**
- `401`: Invalid super admin credentials
- `403`: Super admin account is inactive

---

## 🏢 Company Endpoints

### Company endpoints are managed by super admins only (see Super Admin section)

---

## 🤖 Chatbot Endpoints

All chatbot endpoints require authentication and enforce company isolation.

### 1. Create Chatbot

**Endpoint:** `POST /api/v1/chatbots/`
**Authentication:** Required (JWT)
**Permission:** `create_chatbots`

**Request Body:**
```json
{
  "name": "Sales Assistant",
  "description": "AI assistant for sales inquiries",
  "greeting_message": "Hello! How can I help you today?",
  "allowed_scopes": ["sales", "general"],
  "language": "en",
  "temperature": 0.7
}
```

**Response (200):**
```json
{
  "id": "chatbot_uuid",
  "company_id": "company_uuid",
  "name": "Sales Assistant",
  "deploy_status": "draft",
  "created_at": "2025-01-27T10:00:00Z",
  ...
}
```

**Automatic Assignment:**
- `company_id` extracted from JWT
- `deploy_status` set to `"draft"`
- `created_at` set to current timestamp

---

### 2. List Chatbots

**Endpoint:** `GET /api/v1/chatbots/`
**Authentication:** Required (JWT)
**Permission:** `view_chatbots`

**Query Parameters:**
- `limit` (default: 50)
- `offset` (default: 0)

**Response (200):**
```json
{
  "chatbots": [
    {
      "id": "uuid",
      "name": "Sales Assistant",
      "deploy_status": "active",
      "total_conversations": 245,
      "avg_satisfaction": 0.87,
      ...
    }
  ],
  "total": 5
}
```

**Note:** Only returns chatbots belonging to user's company.

---

### 3. Get Chatbot

**Endpoint:** `GET /api/v1/chatbots/{chatbot_id}`
**Authentication:** Required (JWT)
**Permission:** `view_chatbots`

**Response (200):**
```json
{
  "id": "chatbot_uuid",
  "company_id": "company_uuid",
  "name": "Sales Assistant",
  "description": "AI assistant for sales inquiries",
  "allowed_scopes": ["sales", "general"],
  "deploy_status": "active",
  "metrics": {
    "total_conversations": 245,
    "total_messages": 1523,
    "avg_satisfaction": 0.87
  },
  ...
}
```

**Error Responses:**
- `404`: Chatbot not found or belongs to different company

---

### 4. Update Chatbot

**Endpoint:** `PUT /api/v1/chatbots/{chatbot_id}`
**Authentication:** Required (JWT)
**Permission:** `edit_chatbots`

**Request Body (partial updates allowed):**
```json
{
  "name": "Updated Sales Assistant",
  "greeting_message": "Welcome! How may I assist you?",
  "allowed_scopes": ["sales", "product", "general"]
}
```

**Response (200):**
```json
{
  "id": "chatbot_uuid",
  "name": "Updated Sales Assistant",
  "updated_at": "2025-01-27T11:00:00Z",
  ...
}
```

**Error Responses:**
- `404`: Chatbot not found or belongs to different company

---

### 5. Delete Chatbot

**Endpoint:** `DELETE /api/v1/chatbots/{chatbot_id}`
**Authentication:** Required (JWT)
**Permission:** `delete_chatbots`

**Response (204):**
No content

**Error Responses:**
- `404`: Chatbot not found or belongs to different company

---

### 6. Deploy Chatbot

**Endpoint:** `POST /api/v1/chatbots/{chatbot_id}/deploy`
**Authentication:** Required (JWT)
**Permission:** `deploy_chatbots`

**Response (200):**
```json
{
  "id": "chatbot_uuid",
  "deploy_status": "active",
  "updated_at": "2025-01-27T11:00:00Z"
}
```

**Error Responses:**
- `404`: Chatbot not found or belongs to different company

---

### 7. Pause Chatbot

**Endpoint:** `POST /api/v1/chatbots/{chatbot_id}/pause`
**Authentication:** Required (JWT)
**Permission:** `deploy_chatbots`

**Response (200):**
```json
{
  "id": "chatbot_uuid",
  "deploy_status": "paused",
  "updated_at": "2025-01-27T11:00:00Z"
}
```

---

## 👑 Super Admin Endpoints

All super admin endpoints require `role = "super_admin"` in JWT.

**Base Path:** `/api/v1/super-admin/`

---

### 1. List All Companies

**Endpoint:** `GET /api/v1/super-admin/companies`
**Authentication:** Required (Super Admin)

**Query Parameters:**
- `limit` (default: 50)
- `offset` (default: 0)
- `is_active` (bool, optional) - Filter by active status
- `plan` (string, optional) - Filter by plan (free, pro, enterprise)

**Response (200):**
```json
{
  "companies": [
    {
      "id": "uuid",
      "name": "Acme Corporation",
      "plan": "pro",
      "is_active": true,
      "created_at": "2025-01-15T10:00:00Z",
      "stats": {
        "user_count": 12,
        "chatbot_count": 5,
        "conversation_count": 1245,
        "document_count": 87,
        "total_messages": 8956,
        "avg_satisfaction": 0.85
      }
    }
  ],
  "total": 45
}
```

**Features:**
- Pagination support
- Filtering by active status and plan
- Enriched with company statistics
- Stats calculated via `get_company_stats()` RPC or fallback

---

### 2. Get Company Details

**Endpoint:** `GET /api/v1/super-admin/companies/{company_id}`
**Authentication:** Required (Super Admin)

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Acme Corporation",
  "website": "https://acme.com",
  "industry": "Technology",
  "company_size": "11-50",
  "plan": "pro",
  "max_bots": 10,
  "max_documents": 500,
  "max_monthly_messages": 50000,
  "is_active": true,
  "primary_color": "#1E40AF",
  "secondary_color": "#3B82F6",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-27T09:30:00Z",
  "stats": {
    "user_count": 12,
    "chatbot_count": 5,
    "conversation_count": 1245,
    "document_count": 87,
    "total_messages": 8956,
    "avg_satisfaction": 0.85
  }
}
```

**Error Responses:**
- `404`: Company not found

---

### 3. Update Company

**Endpoint:** `PUT /api/v1/super-admin/companies/{company_id}`
**Authentication:** Required (Super Admin)

**Request Body (partial updates allowed):**
```json
{
  "plan": "enterprise",
  "max_bots": 50,
  "max_documents": 5000,
  "max_monthly_messages": 500000,
  "is_active": true
}
```

**Updatable Fields:**
- `name`, `website`, `industry`, `company_size`
- `plan`, `max_bots`, `max_documents`, `max_monthly_messages`
- `is_active`, `primary_color`, `secondary_color`

**Response (200):**
```json
{
  "id": "uuid",
  "plan": "enterprise",
  "max_bots": 50,
  "updated_at": "2025-01-27T11:00:00Z",
  ...
}
```

---

### 4. Suspend Company

**Endpoint:** `POST /api/v1/super-admin/companies/{company_id}/suspend`
**Authentication:** Required (Super Admin)

**Request Body (optional):**
```json
{
  "reason": "Payment overdue"
}
```

**Actions Performed:**
1. Sets `companies.is_active = false`
2. Sets all users `is_active = false`
3. Sets all chatbots `deploy_status = 'paused'`

**Response (200):**
```json
{
  "success": true,
  "message": "Company suspended successfully",
  "company_id": "uuid",
  "users_affected": 12,
  "chatbots_affected": 5
}
```

**Use Cases:**
- Non-payment
- Terms of Service violation
- Security concerns

---

### 5. Activate Company

**Endpoint:** `POST /api/v1/super-admin/companies/{company_id}/activate`
**Authentication:** Required (Super Admin)

**Actions Performed:**
1. Sets `companies.is_active = true`
2. Sets all users `is_active = true`
3. Sets all chatbots `deploy_status = 'draft'`

**Response (200):**
```json
{
  "success": true,
  "message": "Company activated successfully",
  "company_id": "uuid",
  "users_affected": 12,
  "chatbots_affected": 5
}
```

---

### 6. Platform Analytics

**Endpoint:** `GET /api/v1/super-admin/analytics`
**Authentication:** Required (Super Admin)

**Response (200):**
```json
{
  "conversation_metrics": {
    "total_conversations": 15623,
    "total_messages": 98456,
    "avg_messages_per_conversation": 6.3
  },
  "satisfaction_metrics": {
    "avg_satisfaction": 0.82,
    "response_rate": 0.67,
    "total_feedback": 4521
  },
  "company_stats": {
    "total_companies": 45,
    "active_companies": 42,
    "companies_by_plan": {
      "free": 28,
      "pro": 12,
      "enterprise": 5
    }
  },
  "user_stats": {
    "total_users": 312
  },
  "chatbot_stats": {
    "total_chatbots": 87
  },
  "document_stats": {
    "total_documents": 1523
  }
}
```

**Features:**
- Global metrics across all companies
- No company_id filter applied
- Useful for platform health monitoring

---

### 7. List All Users

**Endpoint:** `GET /api/v1/super-admin/users`
**Authentication:** Required (Super Admin)

**Query Parameters:**
- `limit` (default: 100)
- `offset` (default: 0)
- `company_id` (string, optional) - Filter by company
- `role` (string, optional) - Filter by role

**Response (200):**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "john@acme.com",
      "full_name": "John Doe",
      "company_id": "uuid",
      "company_name": "Acme Corporation",
      "role": "owner",
      "is_active": true,
      "is_admin": true,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 312
}
```

**Features:**
- Pagination support
- Filter by company or role
- Enriched with company names
- Sorted by creation date (newest first)

---

### 8. List All Chatbots

**Endpoint:** `GET /api/v1/super-admin/chatbots`
**Authentication:** Required (Super Admin)

**Query Parameters:**
- `limit` (default: 100)
- `offset` (default: 0)
- `company_id` (string, optional) - Filter by company
- `deploy_status` (string, optional) - Filter by status (draft, active, paused)

**Response (200):**
```json
{
  "chatbots": [
    {
      "id": "uuid",
      "name": "Sales Assistant",
      "company_id": "uuid",
      "company_name": "Acme Corporation",
      "deploy_status": "active",
      "total_conversations": 245,
      "created_at": "2025-01-20T14:00:00Z"
    }
  ],
  "total": 87
}
```

**Features:**
- Pagination support
- Filter by company or deploy status
- Enriched with company names
- Sorted by creation date (newest first)

---

## 📄 Document Endpoints

Document endpoints support multitenancy filtering and scope-based access.

**Note:** Full documentation for document endpoints available in main API docs.

**Key Features:**
- Documents scoped to company
- Optional chatbot assignment
- Scope filtering (sales, support, product, etc.)
- LLM-powered auto-classification

---

## 📊 Analytics Endpoints

Analytics endpoints support three levels of filtering:

1. **Global** (super admin only) - No company_id filter
2. **Company** (company users) - Filter by user's company_id
3. **Chatbot** (specific chatbot) - Filter by chatbot_id

**Note:** Full documentation for analytics endpoints available in main API docs.

**Key Metrics:**
- Conversation metrics (total, messages, avg)
- Satisfaction metrics (rating, response rate)
- Trending queries
- Knowledge base metrics

---

## 🔒 Authentication & Authorization

### JWT Token Format

**Header:**
```
Authorization: Bearer <access_token>
```

**Token Expiration:** 60 minutes

### Permission System

**17 Permissions Across 5 Categories:**

**Documents:**
- `view_documents`
- `upload_documents`
- `delete_documents`

**Chatbots:**
- `view_chatbots`
- `create_chatbots`
- `edit_chatbots`
- `delete_chatbots`
- `deploy_chatbots`

**Analytics:**
- `view_analytics`
- `export_data`

**Team:**
- `view_team`
- `invite_members`
- `edit_members`
- `remove_members`

**Company:**
- `edit_company`
- `manage_billing`
- `manage_roles`

### Predefined Roles

**Owner (17 permissions):**
- Full control over company
- Can manage billing and roles

**Admin (15 permissions):**
- All except billing and role management

**Editor (8 permissions):**
- Create/edit content (documents, chatbots)

**Trainer (5 permissions):**
- Upload documents, edit chatbots

**Analyst (5 permissions):**
- View analytics, export data

**Viewer (4 permissions):**
- Read-only access

---

## 📝 Error Codes

**400 Bad Request:**
- Invalid request body
- Missing required fields
- Validation errors

**401 Unauthorized:**
- Missing or invalid JWT token
- Expired token

**403 Forbidden:**
- User lacks required permission
- User account inactive
- Non-super-admin accessing super admin endpoint

**404 Not Found:**
- Resource not found
- Resource belongs to different company

**500 Internal Server Error:**
- Database error
- Service error

---

## 🔗 API Documentation

**Interactive Docs:**
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

**Health Check:**
- `GET /health` - Returns API status and database connection

---

*Generated: January 27, 2025*
*Version: 2.0.0 (Multitenancy)*
