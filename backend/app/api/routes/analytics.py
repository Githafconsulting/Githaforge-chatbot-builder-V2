"""
Analytics API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from app.models.analytics import AnalyticsOverview, FlaggedQuery
from app.services.analytics_service import (
    get_analytics_overview,
    get_flagged_queries,
    get_daily_stats,
    get_country_stats
)
from app.core.dependencies import get_current_user
from app.utils.logger import get_logger
from typing import List, Optional
from datetime import date

router = APIRouter()
logger = get_logger(__name__)


@router.get("/", response_model=AnalyticsOverview)
async def get_analytics(current_user: dict = Depends(get_current_user)):
    """
    Get complete analytics overview

    Returns analytics filtered by the user's company.
    Super admins see global (all companies) analytics.

    Requires authentication
    """
    try:
        company_id = current_user.get("company_id")
        is_super_admin = current_user.get("is_super_admin", False)

        # Super admin sees global stats, company users see their company only
        analytics = await get_analytics_overview(
            company_id=company_id if not is_super_admin else None
        )
        return analytics

    except Exception as e:
        logger.error(f"Error getting analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/flagged", response_model=List[FlaggedQuery])
async def get_flagged(
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """
    Get flagged queries needing review

    Returns flagged queries filtered by the user's company.
    Super admins see flagged queries from all companies.

    Requires authentication
    """
    try:
        company_id = current_user.get("company_id")
        is_super_admin = current_user.get("is_super_admin", False)

        flagged = await get_flagged_queries(
            limit=limit,
            company_id=company_id if not is_super_admin else None
        )
        return flagged

    except Exception as e:
        logger.error(f"Error getting flagged queries: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/daily")
async def get_daily_analytics(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get daily conversation statistics for date range

    Returns daily stats filtered by the user's company.
    Super admins see stats from all companies.

    Requires authentication
    """
    try:
        company_id = current_user.get("company_id")
        is_super_admin = current_user.get("is_super_admin", False)

        daily_stats = await get_daily_stats(
            start_date,
            end_date,
            company_id=company_id if not is_super_admin else None
        )
        return {"daily_stats": daily_stats}

    except ValueError as e:
        logger.error(f"Invalid date format: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting daily stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/countries")
async def get_country_analytics(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get visitor country statistics

    Returns country stats filtered by the user's company.
    Super admins see stats from all companies.

    Requires authentication
    """
    try:
        company_id = current_user.get("company_id")
        is_super_admin = current_user.get("is_super_admin", False)

        country_stats = await get_country_stats(
            start_date,
            end_date,
            company_id=company_id if not is_super_admin else None
        )
        return {"country_stats": country_stats}

    except ValueError as e:
        logger.error(f"Invalid date format: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting country stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
