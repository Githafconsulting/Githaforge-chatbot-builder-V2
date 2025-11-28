"""
User management API endpoints
"""
from app.core.dependencies import get_current_user, get_current_admin_user
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.user import UserCreate, User
from app.core.database import get_supabase_client
from app.core.security import get_password_hash
from app.utils.logger import get_logger
from datetime import datetime
from typing import List

router = APIRouter()
logger = get_logger(__name__)

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(get_current_admin_user)
):
    """
    Create a new user in the current company

    Request body:
    - email: Valid email address
    - password: Minimum 8 characters
    - full_name: Optional full name
    - is_admin: Optional admin flag (default: false)
    """
    try:
        client = get_supabase_client()

        # Get company_id from current user
        company_id = current_user.get("company_id")
        if not company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot create users without a company"
            )

        # Check if user already exists
        existing = client.table("users").select("*").eq("email", user_data.email).execute()

        if existing.data and len(existing.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"User with email {user_data.email} already exists"
            )

        # Hash password
        password_hash = get_password_hash(user_data.password)

        # Create user record with company_id
        data = {
            "email": user_data.email,
            "password_hash": password_hash,
            "full_name": user_data.full_name,
            "is_active": True,
            "is_admin": user_data.is_admin,
            "company_id": company_id,
            "role": user_data.role if hasattr(user_data, 'role') else "member",
            "created_at": datetime.utcnow().isoformat()
        }

        response = client.table("users").insert(data).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )

        user = response.data[0]

        logger.info(f"User created: {user['email']} for company: {company_id}")

        return {
            "success": True,
            "message": "User created successfully",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "full_name": user["full_name"],
                "is_admin": user["is_admin"],
                "company_id": user["company_id"],
                "created_at": user["created_at"]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )
        


@router.get("/", response_model=List[dict])
async def list_users(current_user: dict = Depends(get_current_admin_user)):
    """
    List users in the current company (without password hashes)

    Returns only users belonging to the same company as the current user.
    Super admins are excluded from company user lists.
    """
    try:
        client = get_supabase_client()

        # Get company_id from current user
        company_id = current_user.get("company_id")
        if not company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot list users without a company"
            )

        # Filter by company_id and exclude super admins
        response = client.table("users").select(
            "id, email, full_name, is_active, is_admin, role, company_id, created_at"
        ).eq("company_id", company_id).eq("is_super_admin", False).execute()

        return response.data if response.data else []

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list users: {str(e)}"
        )


@router.delete("/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_admin_user)):
    """
    Delete a user by ID

    Users can only delete users from their own company.
    Super admins cannot be deleted through this endpoint.
    """
    try:
        client = get_supabase_client()

        # Get company_id from current user
        company_id = current_user.get("company_id")
        if not company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete users without a company"
            )

        # Verify the user belongs to the same company and is not a super admin
        target_user = client.table("users").select(
            "id, company_id, is_super_admin"
        ).eq("id", user_id).single().execute()

        if not target_user.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if target_user.data.get("is_super_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete super admin users"
            )

        if target_user.data.get("company_id") != company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete users from other companies"
            )

        # Delete the user
        response = client.table("users").delete().eq("id", user_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        logger.info(f"User deleted: {user_id} from company: {company_id}")

        return {
            "success": True,
            "message": "User deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )
