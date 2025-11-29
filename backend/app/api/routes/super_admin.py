"""
Super Admin API endpoints (Githaf platform management)

Requires super_admin role with is_super_admin=True in JWT
All endpoints bypass RLS to view/manage all companies
"""
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
from app.core.database import get_supabase_client
from app.core.dependencies import get_current_admin_user
from app.utils.logger import get_logger
from app.services.document_service import (
    process_file_upload,
    process_url,
    get_document_by_id,
    get_document_full_content,
    update_document
)

router = APIRouter()
logger = get_logger(__name__)


class PlatformDocumentUpdateRequest(BaseModel):
    """Request model for updating platform chatbot documents"""
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None


def require_super_admin(current_user: Dict = Depends(get_current_admin_user)):
    """
    Dependency to ensure user is a super admin

    Raises:
        HTTPException: 403 if user is not super admin
    """
    # Check is_super_admin flag (not role field)
    if not current_user.get("is_super_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return current_user


# ===========================
# COMPANIES MANAGEMENT
# ===========================

@router.get("/companies")
async def list_companies(
    limit: int = 50,
    offset: int = 0,
    is_active: Optional[bool] = None,
    plan: Optional[str] = None,
    _: Dict = Depends(require_super_admin)
):
    """
    List all companies with filters

    Query Parameters:
    - limit: Number of companies to return (default 50, max 200)
    - offset: Pagination offset
    - is_active: Filter by active status (true/false)
    - plan: Filter by plan (free/pro/enterprise)

    Returns:
        List of companies with metadata and stats
    """
    try:
        client = get_supabase_client()

        # Limit max results
        limit = min(limit, 200)

        # Build query
        query = client.table("companies").select(
            "id, name, website, logo_url, industry, company_size, "
            "plan, max_bots, max_documents, max_monthly_messages, "
            "is_active, is_platform, created_at, updated_at"
        )

        # Exclude platform company (Githaforge's own company for system chatbot)
        # Platform company is managed via Platform Chatbot page, not here
        query = query.neq("is_platform", True)

        # Apply filters
        if is_active is not None:
            query = query.eq("is_active", is_active)

        if plan:
            query = query.eq("plan", plan)

        # Order by creation date (newest first) and paginate
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)

        response = query.execute()
        companies = response.data if response.data else []

        # Enrich with stats for each company
        for company in companies:
            company_id = company["id"]

            # Get company stats using RPC function (if available) or calculate
            try:
                stats_response = client.rpc("get_company_stats", {"p_company_id": company_id}).execute()

                if stats_response.data and len(stats_response.data) > 0:
                    stats = stats_response.data[0]
                    company["stats"] = {
                        "total_bots": stats.get("total_bots", 0),
                        "active_bots": stats.get("active_bots", 0),
                        "total_documents": stats.get("total_documents", 0),
                        "total_conversations": stats.get("total_conversations", 0),
                        "total_messages": stats.get("total_messages", 0),
                        "avg_satisfaction": stats.get("avg_satisfaction")
                    }
                else:
                    # Fallback: Calculate stats manually
                    company["stats"] = await _calculate_company_stats(company_id)
            except Exception as stats_error:
                logger.warning(f"Failed to get stats for company {company_id}: {stats_error}")
                company["stats"] = await _calculate_company_stats(company_id)

        # Get total count for pagination (excluding platform company)
        count_response = client.table("companies").select("id", count="exact").neq("is_platform", True).execute()
        total_count = count_response.count if count_response.count else 0

        logger.info(f"Super admin listed {len(companies)} companies (total: {total_count})")

        return {
            "companies": companies,
            "total": total_count,
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        logger.error(f"Error listing companies: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list companies: {str(e)}"
        )


@router.get("/companies/{company_id}")
async def get_company_details(
    company_id: str,
    _: Dict = Depends(require_super_admin)
):
    """
    Get detailed information about a specific company

    Returns:
        Company details with:
        - Basic info
        - Statistics
        - List of users
        - List of chatbots
        - Recent activity
    """
    try:
        client = get_supabase_client()

        # Get company info
        company_response = client.table("companies").select("*").eq("id", company_id).execute()

        if not company_response.data or len(company_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )

        company = company_response.data[0]

        # Get company users
        users_response = client.table("users").select(
            "id, email, full_name, role, is_active, created_at"
        ).eq("company_id", company_id).execute()

        company["users"] = users_response.data if users_response.data else []

        # Get company chatbots
        bots_response = client.table("chatbots").select(
            "id, name, description, deploy_status, is_active, "
            "total_conversations, total_messages, avg_satisfaction, created_at"
        ).eq("company_id", company_id).execute()

        company["chatbots"] = bots_response.data if bots_response.data else []

        # Get documents count
        docs_response = client.table("documents").select("id", count="exact").eq("company_id", company_id).execute()
        company["total_documents"] = docs_response.count if docs_response.count else 0

        # Get company stats
        try:
            stats_response = client.rpc("get_company_stats", {"p_company_id": company_id}).execute()

            if stats_response.data and len(stats_response.data) > 0:
                company["stats"] = stats_response.data[0]
            else:
                company["stats"] = await _calculate_company_stats(company_id)
        except:
            company["stats"] = await _calculate_company_stats(company_id)

        logger.info(f"Super admin viewed company {company_id}")

        return company

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting company details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get company details: {str(e)}"
        )


@router.put("/companies/{company_id}")
async def update_company(
    company_id: str,
    updates: Dict[str, Any],
    _: Dict = Depends(require_super_admin)
):
    """
    Update company settings (super admin only)

    Allowed updates:
    - name, website, logo_url
    - plan (free/pro/enterprise)
    - max_bots, max_documents, max_monthly_messages
    - is_active
    """
    try:
        client = get_supabase_client()

        # Whitelist of allowed fields
        allowed_fields = [
            "name", "website", "logo_url", "industry", "company_size",
            "plan", "max_bots", "max_documents", "max_monthly_messages",
            "is_active", "primary_color", "secondary_color"
        ]

        # Filter updates to only allowed fields
        filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}

        if not filtered_updates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid fields to update"
            )

        # Add updated_at timestamp
        filtered_updates["updated_at"] = datetime.utcnow().isoformat()

        # Update company
        response = client.table("companies").update(filtered_updates).eq("id", company_id).execute()

        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )

        updated_company = response.data[0]

        logger.info(f"Super admin updated company {company_id}: {list(filtered_updates.keys())}")

        return {
            "success": True,
            "message": "Company updated successfully",
            "company": updated_company
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating company: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update company: {str(e)}"
        )


@router.post("/companies/{company_id}/suspend")
async def suspend_company(
    company_id: str,
    reason: Optional[str] = None,
    _: Dict = Depends(require_super_admin)
):
    """
    Suspend a company (sets is_active=false)

    This will prevent all users from that company from logging in
    and disable all their chatbots
    """
    try:
        client = get_supabase_client()

        # Update company
        response = client.table("companies").update({
            "is_active": False,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", company_id).execute()

        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )

        # Also suspend all users
        client.table("users").update({"is_active": False}).eq("company_id", company_id).execute()

        # Pause all chatbots
        client.table("chatbots").update({"deploy_status": "paused"}).eq("company_id", company_id).execute()

        logger.warning(f"Super admin suspended company {company_id}. Reason: {reason or 'Not specified'}")

        return {
            "success": True,
            "message": f"Company suspended successfully",
            "company_id": company_id,
            "reason": reason
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error suspending company: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to suspend company: {str(e)}"
        )


@router.post("/companies/{company_id}/activate")
async def activate_company(
    company_id: str,
    _: Dict = Depends(require_super_admin)
):
    """
    Activate a suspended company (sets is_active=true)
    """
    try:
        client = get_supabase_client()

        # Update company
        response = client.table("companies").update({
            "is_active": True,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", company_id).execute()

        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )

        # Also activate all users (they can be individually deactivated later)
        client.table("users").update({"is_active": True}).eq("company_id", company_id).execute()

        logger.info(f"Super admin activated company {company_id}")

        return {
            "success": True,
            "message": "Company activated successfully",
            "company_id": company_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating company: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to activate company: {str(e)}"
        )


# ===========================
# GLOBAL ANALYTICS
# ===========================

@router.get("/analytics")
async def get_platform_analytics(
    _: Dict = Depends(require_super_admin)
):
    """
    Get platform-wide analytics (all companies)

    Returns:
    - Total companies, users, chatbots
    - Total conversations, messages
    - Platform-wide satisfaction
    - Growth metrics
    """
    try:
        from app.services.analytics_service import (
            get_conversation_metrics,
            get_satisfaction_metrics,
            get_knowledge_base_metrics
        )

        client = get_supabase_client()

        # Company metrics
        companies_response = client.table("companies").select("id, is_active", count="exact").execute()
        total_companies = companies_response.count if companies_response.count else 0
        active_companies = len([c for c in companies_response.data if c.get("is_active", False)]) if companies_response.data else 0

        # User metrics
        users_response = client.table("users").select("id, is_active, created_at", count="exact").execute()
        total_users = users_response.count if users_response.count else 0
        active_users = len([u for u in users_response.data if u.get("is_active", False)]) if users_response.data else 0

        # Chatbot metrics
        bots_response = client.table("chatbots").select("id, deploy_status", count="exact").execute()
        total_bots = bots_response.count if bots_response.count else 0
        deployed_bots = len([b for b in bots_response.data if b.get("deploy_status") == "deployed"]) if bots_response.data else 0

        # Get global conversation/satisfaction/knowledge metrics (no company filter)
        conversation_metrics = await get_conversation_metrics()
        satisfaction_metrics = await get_satisfaction_metrics()
        knowledge_metrics = await get_knowledge_base_metrics()

        # Growth metrics (last 30 days)
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()

        new_companies = len([
            c for c in companies_response.data
            if c.get("created_at", "") >= thirty_days_ago
        ]) if companies_response.data else 0

        new_users = len([
            u for u in users_response.data
            if u.get("created_at", "") >= thirty_days_ago
        ]) if users_response.data else 0

        logger.info("Super admin viewed platform analytics")

        return {
            "companies": {
                "total": total_companies,
                "active": active_companies,
                "inactive": total_companies - active_companies,
                "new_last_30_days": new_companies
            },
            "users": {
                "total": total_users,
                "active": active_users,
                "inactive": total_users - active_users,
                "new_last_30_days": new_users
            },
            "chatbots": {
                "total": total_bots,
                "deployed": deployed_bots,
                "draft": total_bots - deployed_bots
            },
            "conversations": conversation_metrics,
            "satisfaction": satisfaction_metrics,
            "knowledge_base": knowledge_metrics,
            "last_updated": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Error getting platform analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get platform analytics: {str(e)}"
        )


@router.get("/users")
async def list_all_users(
    limit: int = 50,
    offset: int = 0,
    company_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    _: Dict = Depends(require_super_admin)
):
    """
    List all users across all companies

    Query Parameters:
    - limit: Number of users to return
    - offset: Pagination offset
    - company_id: Filter by company
    - is_active: Filter by active status
    """
    try:
        client = get_supabase_client()

        # Limit max results
        limit = min(limit, 200)

        # Build query
        query = client.table("users").select(
            "id, email, full_name, company_id, role, is_active, is_admin, created_at"
        )

        # Apply filters
        if company_id:
            query = query.eq("company_id", company_id)

        if is_active is not None:
            query = query.eq("is_active", is_active)

        # Order and paginate
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)

        response = query.execute()
        users = response.data if response.data else []

        # Enrich with company names
        if users:
            # Get all unique company IDs
            company_ids = list(set([u.get("company_id") for u in users if u.get("company_id")]))

            if company_ids:
                companies_response = client.table("companies").select("id, name").in_("id", company_ids).execute()
                companies_map = {c["id"]: c["name"] for c in companies_response.data} if companies_response.data else {}

                # Add company names to users
                for user in users:
                    cid = user.get("company_id")
                    user["company_name"] = companies_map.get(cid, "No Company") if cid else "Super Admin"

        # Get total count
        count_response = client.table("users").select("id", count="exact").execute()
        total_count = count_response.count if count_response.count else 0

        logger.info(f"Super admin listed {len(users)} users (total: {total_count})")

        return {
            "users": users,
            "total": total_count,
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list users: {str(e)}"
        )


@router.get("/chatbots")
async def list_all_chatbots(
    limit: int = 50,
    offset: int = 0,
    company_id: Optional[str] = None,
    deploy_status: Optional[str] = None,
    _: Dict = Depends(require_super_admin)
):
    """
    List all chatbots across all companies

    Query Parameters:
    - limit: Number of chatbots to return
    - offset: Pagination offset
    - company_id: Filter by company
    - deploy_status: Filter by status (draft/deployed/paused)
    """
    try:
        client = get_supabase_client()

        # Limit max results
        limit = min(limit, 200)

        # Build query
        query = client.table("chatbots").select(
            "id, name, description, company_id, deploy_status, is_active, "
            "total_conversations, total_messages, avg_satisfaction, created_at"
        )

        # Apply filters
        if company_id:
            query = query.eq("company_id", company_id)

        if deploy_status:
            query = query.eq("deploy_status", deploy_status)

        # Order and paginate
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)

        response = query.execute()
        chatbots = response.data if response.data else []

        # Enrich with company names
        if chatbots:
            company_ids = list(set([b["company_id"] for b in chatbots]))
            companies_response = client.table("companies").select("id, name").in_("id", company_ids).execute()
            companies_map = {c["id"]: c["name"] for c in companies_response.data} if companies_response.data else {}

            for bot in chatbots:
                bot["company_name"] = companies_map.get(bot["company_id"], "Unknown")

        # Get total count
        count_response = client.table("chatbots").select("id", count="exact").execute()
        total_count = count_response.count if count_response.count else 0

        logger.info(f"Super admin listed {len(chatbots)} chatbots (total: {total_count})")

        return {
            "chatbots": chatbots,
            "total": total_count,
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        logger.error(f"Error listing chatbots: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list chatbots: {str(e)}"
        )


# ===========================
# HELPER FUNCTIONS
# ===========================

async def _calculate_company_stats(company_id: str) -> Dict[str, Any]:
    """
    Calculate company statistics manually

    Args:
        company_id: Company UUID

    Returns:
        Dict with company stats
    """
    try:
        client = get_supabase_client()

        # Count chatbots
        bots_response = client.table("chatbots").select("id, is_active", count="exact").eq("company_id", company_id).execute()
        total_bots = bots_response.count if bots_response.count else 0
        active_bots = len([b for b in bots_response.data if b.get("is_active", False)]) if bots_response.data else 0

        # Count documents
        docs_response = client.table("documents").select("id", count="exact").eq("company_id", company_id).execute()
        total_documents = docs_response.count if docs_response.count else 0

        # Get chatbot IDs for conversation queries
        chatbot_ids = [b["id"] for b in bots_response.data] if bots_response.data else []

        if not chatbot_ids:
            return {
                "total_bots": total_bots,
                "active_bots": active_bots,
                "total_documents": total_documents,
                "total_conversations": 0,
                "total_messages": 0,
                "avg_satisfaction": None
            }

        # Count conversations
        convs_response = client.table("conversations").select("id", count="exact").in_("chatbot_id", chatbot_ids).execute()
        total_conversations = convs_response.count if convs_response.count else 0

        # Count messages
        conversation_ids = [c["id"] for c in convs_response.data] if convs_response.data else []

        if conversation_ids:
            msgs_response = client.table("messages").select("id", count="exact").in_("conversation_id", conversation_ids).execute()
            total_messages = msgs_response.count if msgs_response.count else 0

            # Calculate satisfaction
            feedback_response = client.table("feedback").select("rating").in_("conversation_id", conversation_ids).execute()
            feedback_list = feedback_response.data if feedback_response.data else []

            if feedback_list:
                ratings = [f["rating"] for f in feedback_list]
                avg_satisfaction = sum(ratings) / len(ratings) if ratings else None
            else:
                avg_satisfaction = None
        else:
            total_messages = 0
            avg_satisfaction = None

        return {
            "total_bots": total_bots,
            "active_bots": active_bots,
            "total_documents": total_documents,
            "total_conversations": total_conversations,
            "total_messages": total_messages,
            "avg_satisfaction": avg_satisfaction
        }

    except Exception as e:
        logger.error(f"Error calculating company stats: {e}")
        return {
            "total_bots": 0,
            "active_bots": 0,
            "total_documents": 0,
            "total_conversations": 0,
            "total_messages": 0,
            "avg_satisfaction": None
        }


# ===========================
# PLATFORM CHATBOT MANAGEMENT
# ===========================

@router.get("/platform-chatbot")
async def get_platform_chatbot(
    _: Dict = Depends(require_super_admin)
):
    """
    Get the platform chatbot (website demo bot) and its knowledge base

    Returns:
        - Chatbot details
        - Associated documents
        - Stats (messages, satisfaction, etc.)
    """
    try:
        client = get_supabase_client()

        # Find the system chatbot (is_system=True)
        chatbot_response = client.table("chatbots").select("*").eq("is_system", True).execute()

        if not chatbot_response.data or len(chatbot_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Platform chatbot not found. Please run the seed script: python -m scripts.seed_platform_chatbot"
            )

        chatbot = chatbot_response.data[0]
        company_id = chatbot["company_id"]

        # Get documents associated with this chatbot
        docs_response = client.table("documents").select(
            "id, title, file_type, file_size, chunk_count, created_at, summary"
        ).eq("company_id", company_id).order("created_at", desc=True).execute()

        documents = docs_response.data if docs_response.data else []

        # Calculate stats
        total_chunks = sum(doc.get("chunk_count", 0) for doc in documents)

        # Get conversation stats for this chatbot
        convs_response = client.table("conversations").select("id", count="exact").eq("chatbot_id", chatbot["id"]).execute()
        total_conversations = convs_response.count if convs_response.count else 0

        # Get message count
        total_messages = 0
        avg_satisfaction = None

        if convs_response.data:
            conv_ids = [c["id"] for c in convs_response.data]
            if conv_ids:
                msgs_response = client.table("messages").select("id", count="exact").in_("conversation_id", conv_ids).execute()
                total_messages = msgs_response.count if msgs_response.count else 0

                # Get satisfaction
                feedback_response = client.table("feedback").select("rating").in_("conversation_id", conv_ids).execute()
                if feedback_response.data:
                    ratings = [f["rating"] for f in feedback_response.data]
                    avg_satisfaction = sum(ratings) / len(ratings) if ratings else None

        logger.info(f"Super admin viewed platform chatbot: {chatbot['id']}")

        return {
            "chatbot": chatbot,
            "documents": documents,
            "stats": {
                "total_documents": len(documents),
                "total_chunks": total_chunks,
                "total_conversations": total_conversations,
                "total_messages": total_messages,
                "avg_satisfaction": avg_satisfaction
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting platform chatbot: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get platform chatbot: {str(e)}"
        )


@router.post("/platform-chatbot/documents")
async def upload_platform_document(
    file: UploadFile = File(...),
    _: Dict = Depends(require_super_admin)
):
    """
    Upload a document to the platform chatbot's knowledge base

    Supported formats: PDF, DOCX, TXT, MD

    The document will be:
    1. Stored in Supabase Storage
    2. Chunked and embedded
    3. Associated with the platform company
    """
    try:
        client = get_supabase_client()

        # Find the platform company
        company_response = client.table("companies").select("id").eq("is_platform", True).execute()

        if not company_response.data or len(company_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Platform company not found. Please run the seed script."
            )

        company_id = company_response.data[0]["id"]

        # Validate file type
        allowed_types = [".pdf", ".docx", ".txt", ".md"]
        file_ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""

        if file_ext not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_types)}"
            )

        # Read file content
        file_content = await file.read()

        # Process the file (upload, chunk, embed)
        result = await process_file_upload(
            file_content=file_content,
            filename=file.filename,
            category="platform",
            company_id=company_id
        )

        logger.info(f"Super admin uploaded platform document: {file.filename}")

        return {
            "success": True,
            "message": "Document uploaded and processed successfully",
            "document": result
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading platform document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document: {str(e)}"
        )


@router.delete("/platform-chatbot/documents/{document_id}")
async def delete_platform_document(
    document_id: str,
    _: Dict = Depends(require_super_admin)
):
    """
    Delete a document from the platform chatbot's knowledge base

    This will:
    1. Remove the document from the database
    2. Delete associated embeddings
    3. Remove the file from storage
    """
    try:
        client = get_supabase_client()

        # Verify this document belongs to the platform company
        company_response = client.table("companies").select("id").eq("is_platform", True).execute()

        if not company_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Platform company not found"
            )

        platform_company_id = company_response.data[0]["id"]

        # Get the document
        doc_response = client.table("documents").select("id, company_id, storage_path").eq("id", document_id).execute()

        if not doc_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        document = doc_response.data[0]

        # Verify it belongs to platform company
        if document["company_id"] != platform_company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This document does not belong to the platform chatbot"
            )

        # Delete embeddings first (foreign key constraint)
        client.table("embeddings").delete().eq("document_id", document_id).execute()

        # Delete the document
        client.table("documents").delete().eq("id", document_id).execute()

        # Try to delete from storage (optional, may fail if path doesn't exist)
        if document.get("storage_path"):
            try:
                client.storage.from_("documents").remove([document["storage_path"]])
            except Exception as storage_error:
                logger.warning(f"Failed to delete storage file: {storage_error}")

        logger.info(f"Super admin deleted platform document: {document_id}")

        return {
            "success": True,
            "message": "Document deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting platform document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}"
        )


@router.post("/platform-chatbot/documents/url")
async def add_platform_document_from_url(
    url: str = Form(...),
    category: Optional[str] = Form(None),
    _: Dict = Depends(require_super_admin)
):
    """
    Add a document to the platform chatbot's knowledge base from a URL

    Scrapes the URL content and processes it into embeddings.

    Args:
        url: URL to scrape
        category: Optional category for the document
    """
    try:
        client = get_supabase_client()

        # Find the platform company
        company_response = client.table("companies").select("id").eq("is_platform", True).execute()

        if not company_response.data or len(company_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Platform company not found. Please run the seed script."
            )

        company_id = company_response.data[0]["id"]

        # Process the URL with company_id
        document = await process_url(
            url=url,
            category=category or "platform",
            company_id=company_id
        )

        logger.info(f"Super admin added platform document from URL: {url}")

        return {
            "success": True,
            "message": "URL content processed successfully",
            "document": document
        }

    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"Error processing URL for platform chatbot: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process URL: {str(e)}"
        )


@router.get("/platform-chatbot/documents/{document_id}/content")
async def get_platform_document_content(
    document_id: str,
    _: Dict = Depends(require_super_admin)
):
    """
    Get full content of a platform chatbot document

    Reconstructs the full text from embedding chunks.

    Args:
        document_id: Document UUID
    """
    try:
        client = get_supabase_client()

        # Verify this document belongs to the platform company
        company_response = client.table("companies").select("id").eq("is_platform", True).execute()

        if not company_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Platform company not found"
            )

        platform_company_id = company_response.data[0]["id"]

        # Get the document
        document = await get_document_by_id(document_id)

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        # Verify it belongs to platform company
        if document.get("company_id") != platform_company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This document does not belong to the platform chatbot"
            )

        # Get full content
        content = await get_document_full_content(document_id)

        if content is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document content not found"
            )

        logger.info(f"Super admin retrieved platform document content: {document_id}")

        return {
            "success": True,
            "document_id": document_id,
            "content": content
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting platform document content: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get document content: {str(e)}"
        )


@router.put("/platform-chatbot/documents/{document_id}")
async def update_platform_document(
    document_id: str,
    update_request: PlatformDocumentUpdateRequest,
    _: Dict = Depends(require_super_admin)
):
    """
    Update a platform chatbot document

    Can update title, content, and category. If content is updated,
    embeddings will be regenerated.

    Args:
        document_id: Document UUID
        update_request: Fields to update
    """
    try:
        client = get_supabase_client()

        # Verify this document belongs to the platform company
        company_response = client.table("companies").select("id").eq("is_platform", True).execute()

        if not company_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Platform company not found"
            )

        platform_company_id = company_response.data[0]["id"]

        # Get the document
        document = await get_document_by_id(document_id)

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        # Verify it belongs to platform company
        if document.get("company_id") != platform_company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This document does not belong to the platform chatbot"
            )

        # Update the document
        updated_document = await update_document(
            document_id=document_id,
            title=update_request.title,
            content=update_request.content,
            category=update_request.category
        )

        if not updated_document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        logger.info(f"Super admin updated platform document: {document_id}")

        return {
            "success": True,
            "message": "Document updated successfully" + (" and embeddings regenerated" if update_request.content else ""),
            "document": updated_document
        }

    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"Error updating platform document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update document: {str(e)}"
        )


@router.get("/platform-chatbot/documents/{document_id}/download")
async def download_platform_document(
    document_id: str,
    _: Dict = Depends(require_super_admin)
):
    """
    Download a platform chatbot document

    Returns the original file from storage, or a text file reconstructed
    from embedding chunks if the original is not available.

    Args:
        document_id: Document UUID
    """
    try:
        from fastapi.responses import StreamingResponse
        from app.services.storage_service import get_file_from_storage
        import io

        client = get_supabase_client()

        # Verify this document belongs to the platform company
        company_response = client.table("companies").select("id").eq("is_platform", True).execute()

        if not company_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Platform company not found"
            )

        platform_company_id = company_response.data[0]["id"]

        # Get the document
        document = await get_document_by_id(document_id)

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        # Verify it belongs to platform company
        if document.get("company_id") != platform_company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This document does not belong to the platform chatbot"
            )

        # If document has a storage path, download from storage
        if document.get("storage_path"):
            try:
                file_content = await get_file_from_storage(document["storage_path"])
                filename = document["title"]

                logger.info(f"Super admin downloaded platform document from storage: {document_id}")

                # Return file with appropriate content type
                return StreamingResponse(
                    io.BytesIO(file_content),
                    media_type="application/octet-stream",
                    headers={
                        "Content-Disposition": f'attachment; filename="{filename}"'
                    }
                )
            except Exception as e:
                logger.warning(f"Could not download from storage: {e}. Falling back to content reconstruction.")

        # Fallback: Generate text file from reconstructed content
        content = await get_document_full_content(document_id)

        if content is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document content not found"
            )

        # Generate filename
        filename = document["title"]
        if not filename.endswith('.txt'):
            filename = f"{filename}.txt"

        logger.info(f"Super admin downloaded platform document (reconstructed): {document_id}")

        # Return content as text file
        return StreamingResponse(
            io.BytesIO(content.encode('utf-8')),
            media_type="text/plain",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading platform document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download document: {str(e)}"
        )
