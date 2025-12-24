"""
Company CRUD API routes for multi-tenant management
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List, Optional
from app.models.company import (
    CompanyCreate,
    CompanyUpdate,
    Company,
    CompanyWithStats,
    CompanyStats
)
from app.services.company_service import CompanyService
from app.core.dependencies import get_current_user
from app.core.multitenancy import verify_company_access
from app.core.database import get_supabase_client
from app.models.user import User
from app.utils.logger import logger

router = APIRouter()


@router.get("/me", response_model=Company)
async def get_my_company(
    current_user: dict = Depends(get_current_user)
):
    """
    Get the current user's company settings

    Returns company details for the logged-in user's company.
    Used by Company Settings page for company admins.

    Super admins (who have no company) receive a 403 Forbidden.
    """
    # Check if user is super admin (no company)
    if current_user.get("is_super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admins do not belong to a company. Use super admin endpoints instead."
        )

    company_id = current_user.get("company_id")

    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not associated with any company"
        )

    service = CompanyService()
    company = await service.get_company(company_id)

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )

    return company


@router.post("/", response_model=Company, status_code=status.HTTP_201_CREATED)
async def create_company(
    company_data: CompanyCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new company (during signup or by admin)

    - **name**: Company name (2-100 characters)
    - **website**: Optional company website URL
    - **logo_url**: Optional logo URL
    - **primary_color**: Hex color (default: #1e40af)
    - **secondary_color**: Hex color (default: #0ea5e9)
    - **company_size**: Optional size category
    - **industry**: Optional industry
    - **plan**: free/pro/enterprise (default: free)
    """
    try:
        service = CompanyService()
        company = await service.create_company(company_data)

        # Provision company resources (storage bucket, RLS context)
        await service.provision_company_resources(company.id)

        return company
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create company: {str(e)}"
        )


@router.get("/{company_id}", response_model=Company)
async def get_company(
    company_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get company by ID

    - **company_id**: UUID of the company

    Returns company details including plan limits.
    Verifies user belongs to the company or is super admin.
    """
    service = CompanyService()
    company = await service.get_company(company_id)

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found"
        )

    # Verify user has access to this company
    verify_company_access(company_id, current_user, "company")

    return company


@router.put("/{company_id}", response_model=Company)
async def update_company(
    company_id: str,
    company_data: CompanyUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update company settings

    - **company_id**: UUID of the company
    - **company_data**: Fields to update (all optional)

    Allows updating:
    - Company name, website, logo
    - Brand colors (primary, secondary)
    - Company size, industry

    Note: Plan and limits can only be changed by super admin.
    Verifies user belongs to the company or is super admin.
    """
    # Verify user has access to this company
    verify_company_access(company_id, current_user, "company")

    service = CompanyService()
    company = await service.update_company(company_id, company_data)

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found"
        )

    return company


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Soft delete a company

    - **company_id**: UUID of the company

    Sets is_active=false instead of hard delete.
    Cascades to all company resources (chatbots, documents, etc.).
    Verifies user belongs to the company or is super admin.

    IMPORTANT: This action cannot be undone by users (admin recovery only)
    """
    # Verify user has access to this company
    verify_company_access(company_id, current_user, "company")

    service = CompanyService()
    success = await service.delete_company(company_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found"
        )

    return None


@router.get("/{company_id}/stats", response_model=CompanyStats)
async def get_company_stats(
    company_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get company statistics

    - **company_id**: UUID of the company

    Returns:
    - Total chatbots
    - Total documents
    - Total conversations
    - Total messages
    - Average satisfaction score

    Verifies user belongs to the company or is super admin.
    """
    # Verify user has access to this company
    verify_company_access(company_id, current_user, "company")

    service = CompanyService()

    # Verify company exists
    company = await service.get_company(company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found"
        )

    stats = await service.get_company_stats(company_id)
    return stats


@router.get("/", response_model=List[Company])
async def list_companies(
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    """
    List all companies (admin only)

    - **limit**: Max number of results (default: 100)
    - **offset**: Pagination offset (default: 0)

    Super admin can see all companies
    Regular users can only see their own company
    """
    # TODO: Implement authorization check
    # if not current_user.is_super_admin:
    #     # Return only user's company
    #     service = CompanyService()
    #     company = await service.get_company(current_user.company_id)
    #     return [company] if company else []

    service = CompanyService()
    companies = await service.list_companies(limit=limit, offset=offset)
    return companies


@router.get("/{company_id}/with-stats", response_model=CompanyWithStats)
async def get_company_with_stats(
    company_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get company details with statistics in a single call

    - **company_id**: UUID of the company

    Combines company info + stats for dashboard display.
    Optimized to reduce API calls.
    Verifies user belongs to the company or is super admin.
    """
    # Verify user has access to this company
    verify_company_access(company_id, current_user, "company")

    service = CompanyService()

    # Get company
    company = await service.get_company(company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found"
        )

    # Get stats
    stats = await service.get_company_stats(company_id)

    # Combine
    company_with_stats = CompanyWithStats(
        **company.dict(),
        stats=stats
    )

    return company_with_stats


@router.post("/upload-logo")
async def upload_company_logo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload company logo.

    - Accepts image files (PNG, JPG, GIF, WebP)
    - Max file size: 2MB
    - Returns the URL of the uploaded logo

    The logo is stored in Supabase Storage and the URL is saved to the company record.
    """
    try:
        client = get_supabase_client()
        company_id = current_user.get("company_id")

        if not company_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not associated with a company"
            )

        # Validate file type
        allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Allowed: PNG, JPG, GIF, WebP"
            )

        # Read file content
        content = await file.read()

        # Validate file size (2MB max)
        if len(content) > 2 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Maximum size is 2MB"
            )

        # Generate unique filename
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "png"
        unique_filename = f"{company_id}/{uuid.uuid4()}.{file_ext}"
        storage_path = unique_filename

        # Upload to Supabase Storage
        try:
            # Upload new logo
            upload_response = client.storage.from_("company-logos").upload(
                storage_path,
                content,
                {"content-type": file.content_type}
            )
        except Exception as storage_error:
            logger.error(f"Storage upload error: {storage_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload file to storage: {str(storage_error)}"
            )

        # Get public URL
        public_url = client.storage.from_("company-logos").get_public_url(storage_path)

        # Update company record with logo URL
        update_response = client.table("companies").update({
            "logo_url": public_url
        }).eq("id", company_id).execute()

        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update company logo URL"
            )

        logger.info(f"Logo uploaded for company: {company_id}")

        return {
            "success": True,
            "url": public_url,
            "message": "Company logo uploaded successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading company logo: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload company logo: {str(e)}"
        )
