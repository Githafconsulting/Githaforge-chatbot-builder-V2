from fastapi import APIRouter, HTTPException, Query, Depends, UploadFile, File
from typing import Optional, List
import math
import uuid
from datetime import datetime

from app.core.database import get_supabase_client
from app.models.blog import (
    Blog,
    BlogCreate,
    BlogUpdate,
    BlogListResponse,
    BlogCategory,
    BlogCategoryCreate,
    BlogCategoryUpdate,
    BlogStatus,
    BlogPublishRequest,
)
from app.services.blog_service import get_blog_service
from app.core.dependencies import get_current_user

router = APIRouter()


# ==================== PUBLIC ENDPOINTS ====================

@router.get("/", response_model=BlogListResponse)
async def get_public_blogs(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    category: Optional[str] = None,
    tag: Optional[str] = None,
    featured: bool = False,
    search: Optional[str] = None,
):
    """Get published blogs for public consumption."""
    service = get_blog_service()
    blogs, total = service.get_public_blogs(
        page=page,
        page_size=page_size,
        category_slug=category,
        tag=tag,
        featured_only=featured,
        search=search,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return BlogListResponse(
        blogs=blogs,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/featured", response_model=List[Blog])
async def get_featured_blogs(limit: int = Query(2, ge=1, le=10)):
    """Get featured published blogs."""
    service = get_blog_service()
    return service.get_featured_blogs(limit=limit)


@router.get("/recent", response_model=List[Blog])
async def get_recent_blogs(
    limit: int = Query(6, ge=1, le=20),
    exclude_featured: bool = True,
):
    """Get recent published blogs."""
    service = get_blog_service()
    return service.get_recent_blogs(limit=limit, exclude_featured=exclude_featured)


@router.get("/categories", response_model=List[BlogCategory])
async def get_categories():
    """Get all blog categories."""
    service = get_blog_service()
    return service.get_categories()


@router.get("/tags", response_model=List[str])
async def get_tags():
    """Get all unique tags from published blogs."""
    service = get_blog_service()
    return service.get_all_tags()


@router.get("/slug/{slug}", response_model=Blog)
async def get_blog_by_slug(slug: str):
    """Get a published blog by slug (increments view count)."""
    service = get_blog_service()
    blog = service.get_blog_by_slug(slug, increment_views=True)

    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    if blog.status != BlogStatus.PUBLISHED:
        raise HTTPException(status_code=404, detail="Blog not found")

    return blog


@router.get("/{blog_id}/related", response_model=List[Blog])
async def get_related_blogs(blog_id: str, limit: int = Query(3, ge=1, le=10)):
    """Get related blogs based on category and tags."""
    service = get_blog_service()
    return service.get_related_blogs(blog_id, limit=limit)


# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/all", response_model=BlogListResponse)
async def get_all_blogs_admin(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    status: Optional[BlogStatus] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    """Get all blogs for admin (includes drafts)."""
    service = get_blog_service()
    blogs, total = service.get_blogs(
        page=page,
        page_size=page_size,
        status=status,
        category_slug=category,
        search=search,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return BlogListResponse(
        blogs=blogs,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/admin/{blog_id}", response_model=Blog)
async def get_blog_admin(blog_id: str, current_user=Depends(get_current_user)):
    """Get a blog by ID (admin access, includes drafts)."""
    service = get_blog_service()
    blog = service.get_blog_by_id(blog_id)

    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    return blog


@router.post("/admin", response_model=Blog)
async def create_blog(blog: BlogCreate, current_user=Depends(get_current_user)):
    """Create a new blog post."""
    service = get_blog_service()

    try:
        return service.create_blog(blog, author_id=current_user.get("id"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/admin/{blog_id}", response_model=Blog)
async def update_blog(
    blog_id: str,
    blog: BlogUpdate,
    current_user=Depends(get_current_user),
):
    """Update a blog post."""
    service = get_blog_service()

    existing = service.get_blog_by_id(blog_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Blog not found")

    try:
        updated = service.update_blog(blog_id, blog)
        return updated
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/{blog_id}/publish", response_model=Blog)
async def publish_blog(
    blog_id: str,
    request: BlogPublishRequest,
    current_user=Depends(get_current_user),
):
    """Publish or unpublish a blog post."""
    service = get_blog_service()

    existing = service.get_blog_by_id(blog_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Blog not found")

    try:
        return service.publish_blog(blog_id, request.publish)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/admin/{blog_id}")
async def delete_blog(blog_id: str, current_user=Depends(get_current_user)):
    """Delete a blog post."""
    service = get_blog_service()

    existing = service.get_blog_by_id(blog_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Blog not found")

    service.delete_blog(blog_id)
    return {"message": "Blog deleted successfully"}


# ==================== CATEGORY ADMIN ENDPOINTS ====================

@router.post("/admin/categories", response_model=BlogCategory)
async def create_category(
    category: BlogCategoryCreate,
    current_user=Depends(get_current_user),
):
    """Create a new blog category."""
    service = get_blog_service()

    try:
        return service.create_category(category)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/admin/categories/{category_id}", response_model=BlogCategory)
async def update_category(
    category_id: str,
    category: BlogCategoryUpdate,
    current_user=Depends(get_current_user),
):
    """Update a blog category."""
    service = get_blog_service()

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
    """Delete a blog category."""
    service = get_blog_service()

    existing = service.get_category_by_id(category_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")

    service.delete_category(category_id)
    return {"message": "Category deleted successfully"}


# ==================== IMAGE UPLOAD ENDPOINT ====================

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/admin/upload-image")
async def upload_blog_image(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """
    Upload an image for blog posts.
    Returns the public URL of the uploaded image.
    """
    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_IMAGE_TYPES)}"
        )

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_IMAGE_SIZE // (1024 * 1024)}MB"
        )

    # Generate unique filename
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    new_filename = f"{timestamp}_{unique_id}.{file_extension}"
    storage_path = f"blog-images/{new_filename}"

    try:
        client = get_supabase_client()

        # Upload to Supabase Storage
        response = client.storage.from_("blog-images").upload(
            path=new_filename,
            file=content,
            file_options={"content-type": file.content_type}
        )

        # Get public URL
        public_url = client.storage.from_("blog-images").get_public_url(new_filename)

        return {
            "success": True,
            "url": public_url,
            "filename": new_filename,
            "size": len(content),
            "content_type": file.content_type
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload image: {str(e)}"
        )


@router.delete("/admin/delete-image/{filename}")
async def delete_blog_image(
    filename: str,
    current_user=Depends(get_current_user),
):
    """Delete an uploaded blog image."""
    try:
        client = get_supabase_client()
        client.storage.from_("blog-images").remove([filename])
        return {"success": True, "message": "Image deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete image: {str(e)}"
        )
