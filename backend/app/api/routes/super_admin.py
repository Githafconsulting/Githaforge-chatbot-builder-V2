"""
Super Admin API endpoints (Githaf platform management)

Requires super_admin role with is_super_admin=True in JWT
All endpoints bypass RLS to view/manage all companies
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from app.core.database import get_supabase_client
from app.core.dependencies import get_current_admin_user
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


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
            "is_active, created_at, updated_at"
        )

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

        # Get total count for pagination
        count_response = client.table("companies").select("id", count="exact").execute()
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
