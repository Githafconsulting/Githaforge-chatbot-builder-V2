from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
import math

from app.models.faq import (
    FAQ,
    FAQCreate,
    FAQUpdate,
    FAQListResponse,
    FAQCategory,
    FAQCategoryCreate,
    FAQCategoryUpdate,
    FAQFeedbackRequest,
)
from app.services.faq_service import get_faq_service
from app.core.dependencies import get_current_user

router = APIRouter()


# ==================== PUBLIC ENDPOINTS ====================

@router.get("/", response_model=List[FAQ])
async def get_public_faqs(category: Optional[str] = None):
    """Get all active FAQs for public consumption."""
    service = get_faq_service()
    return service.get_public_faqs(category_slug=category)


@router.get("/featured", response_model=List[FAQ])
async def get_featured_faqs(limit: int = Query(5, ge=1, le=20)):
    """Get featured active FAQs."""
    service = get_faq_service()
    return service.get_featured_faqs(limit=limit)


@router.get("/categories", response_model=List[FAQCategory])
async def get_categories():
    """Get all active FAQ categories."""
    service = get_faq_service()
    return service.get_categories(include_inactive=False)


@router.post("/{faq_id}/feedback")
async def record_faq_feedback(faq_id: str, request: FAQFeedbackRequest):
    """Record user feedback (helpful/not helpful) for a FAQ."""
    service = get_faq_service()
    faq = service.record_feedback(faq_id, request.helpful)

    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")

    return {"success": True, "message": "Feedback recorded"}


@router.post("/{faq_id}/view")
async def record_faq_view(faq_id: str):
    """Record a view for a FAQ."""
    service = get_faq_service()
    service.increment_view_count(faq_id)
    return {"success": True}


# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/all", response_model=FAQListResponse)
async def get_all_faqs_admin(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    category_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_featured: Optional[bool] = None,
    search: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    """Get all FAQs for admin (includes inactive)."""
    service = get_faq_service()
    faqs, total = service.get_faqs(
        page=page,
        page_size=page_size,
        category_id=category_id,
        is_active=is_active,
        is_featured=is_featured,
        search=search,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return FAQListResponse(
        faqs=faqs,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/admin/categories", response_model=List[FAQCategory])
async def get_all_categories_admin(current_user=Depends(get_current_user)):
    """Get all FAQ categories for admin (includes inactive)."""
    service = get_faq_service()
    return service.get_categories(include_inactive=True)


@router.get("/admin/{faq_id}", response_model=FAQ)
async def get_faq_admin(faq_id: str, current_user=Depends(get_current_user)):
    """Get a FAQ by ID (admin access)."""
    service = get_faq_service()
    faq = service.get_faq_by_id(faq_id)

    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")

    return faq


@router.post("/admin", response_model=FAQ)
async def create_faq(faq: FAQCreate, current_user=Depends(get_current_user)):
    """Create a new FAQ."""
    service = get_faq_service()

    try:
        return service.create_faq(faq)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/admin/{faq_id}", response_model=FAQ)
async def update_faq(
    faq_id: str,
    faq: FAQUpdate,
    current_user=Depends(get_current_user),
):
    """Update a FAQ."""
    service = get_faq_service()

    existing = service.get_faq_by_id(faq_id)
    if not existing:
        raise HTTPException(status_code=404, detail="FAQ not found")

    try:
        updated = service.update_faq(faq_id, faq)
        return updated
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/admin/{faq_id}")
async def delete_faq(faq_id: str, current_user=Depends(get_current_user)):
    """Delete a FAQ."""
    service = get_faq_service()

    existing = service.get_faq_by_id(faq_id)
    if not existing:
        raise HTTPException(status_code=404, detail="FAQ not found")

    service.delete_faq(faq_id)
    return {"message": "FAQ deleted successfully"}


@router.post("/admin/reorder")
async def reorder_faqs(
    orders: List[dict],
    current_user=Depends(get_current_user),
):
    """Reorder FAQs. Expects list of {id: string, order: number}."""
    service = get_faq_service()

    if service.reorder_faqs(orders):
        return {"success": True, "message": "FAQs reordered successfully"}
    else:
        raise HTTPException(status_code=400, detail="Failed to reorder FAQs")


# ==================== CATEGORY ADMIN ENDPOINTS ====================

@router.post("/admin/categories", response_model=FAQCategory)
async def create_category(
    category: FAQCategoryCreate,
    current_user=Depends(get_current_user),
):
    """Create a new FAQ category."""
    service = get_faq_service()

    try:
        return service.create_category(category)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/admin/categories/{category_id}", response_model=FAQCategory)
async def update_category(
    category_id: str,
    category: FAQCategoryUpdate,
    current_user=Depends(get_current_user),
):
    """Update a FAQ category."""
    service = get_faq_service()

    existing = service.get_category_by_id(category_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")

    try:
        return service.update_category(category_id, category)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/admin/categories/{category_id}")
async def delete_category(
    category_id: str,
    current_user=Depends(get_current_user),
):
    """Delete a FAQ category."""
    service = get_faq_service()

    existing = service.get_category_by_id(category_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")

    service.delete_category(category_id)
    return {"message": "Category deleted successfully"}


@router.post("/admin/categories/reorder")
async def reorder_categories(
    orders: List[dict],
    current_user=Depends(get_current_user),
):
    """Reorder categories. Expects list of {id: string, order: number}."""
    service = get_faq_service()

    if service.reorder_categories(orders):
        return {"success": True, "message": "Categories reordered successfully"}
    else:
        raise HTTPException(status_code=400, detail="Failed to reorder categories")
