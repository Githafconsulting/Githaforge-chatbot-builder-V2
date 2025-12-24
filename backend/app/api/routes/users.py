"""
User management API endpoints
"""
from app.core.dependencies import get_current_user, get_current_admin_user
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from app.models.user import UserCreate, User
from app.core.database import get_supabase_client
from app.core.security import get_password_hash
from app.utils.logger import get_logger
from datetime import datetime
from typing import List
import uuid

router = APIRouter()
logger = get_logger(__name__)

@router.get("/me", response_model=dict)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current user's information

    Returns the authenticated user's details.
    """
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "first_name": current_user.get("first_name"),
        "last_name": current_user.get("last_name"),
        "full_name": current_user.get("full_name"),
        "role": current_user.get("role"),
        "company_id": current_user.get("company_id"),
        "is_active": current_user.get("is_active")
    }

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

        # Compute full_name from first_name + last_name if not provided
        full_name = user_data.full_name
        if not full_name and (user_data.first_name or user_data.last_name):
            full_name = f"{user_data.first_name or ''} {user_data.last_name or ''}".strip()

        # Determine role from role_id or default to member
        role = user_data.role_id if user_data.role_id else "member"

        # Validate owner role assignment
        # Only owners can assign owner role, and there can only be 1 owner per company
        current_user_role = current_user.get("role", "member")
        if role == "owner":
            if current_user_role != "owner":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only owners can assign the owner role"
                )
            # Check if company already has an owner
            existing_owner = client.table("users").select("id").eq(
                "company_id", company_id
            ).eq("role", "owner").execute()
            if existing_owner.data and len(existing_owner.data) > 0:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Company already has an owner. There can only be one owner per company."
                )

        # Create user record with company_id
        data = {
            "email": user_data.email,
            "password_hash": password_hash,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "full_name": full_name,
            "is_active": True,
            "is_admin": user_data.is_admin,
            "company_id": company_id,
            "role": role,
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
                "first_name": user.get("first_name"),
                "last_name": user.get("last_name"),
                "full_name": user.get("full_name"),
                "role": user.get("role"),
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
        # Try to select with first_name/last_name, fallback to without if columns don't exist
        try:
            response = client.table("users").select(
                "id, email, first_name, last_name, full_name, is_active, is_admin, role, company_id, created_at"
            ).eq("company_id", company_id).eq("is_super_admin", False).execute()
        except Exception as col_error:
            # Fallback: columns might not exist yet
            if "first_name" in str(col_error) or "last_name" in str(col_error):
                logger.warning("first_name/last_name columns not found, using fallback query")
                response = client.table("users").select(
                    "id, email, full_name, is_active, is_admin, role, company_id, created_at"
                ).eq("company_id", company_id).eq("is_super_admin", False).execute()
            else:
                raise

        return response.data if response.data else []

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list users: {str(e)}"
        )


@router.patch("/{user_id}")
async def update_user(user_id: str, user_data: dict, current_user: dict = Depends(get_current_admin_user)):
    """
    Update a user by ID

    Request body (all fields optional):
    - first_name: User's first name
    - last_name: User's last name
    - role: Role code (owner, admin, editor, trainer, analyst, viewer)
    - is_active: Boolean to activate/deactivate user

    Users can only update users from their own company.
    Super admins cannot be updated through this endpoint.
    """
    try:
        client = get_supabase_client()

        # Get company_id from current user
        company_id = current_user.get("company_id")
        if not company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot update users without a company"
            )

        # Verify the user belongs to the same company and is not a super admin
        # Also fetch first_name/last_name to compute full_name correctly
        try:
            target_user = client.table("users").select(
                "id, company_id, is_super_admin, first_name, last_name"
            ).eq("id", user_id).single().execute()
        except Exception as col_error:
            # Fallback: columns might not exist yet
            if "first_name" in str(col_error) or "last_name" in str(col_error):
                logger.warning("first_name/last_name columns not found, using fallback query")
                target_user = client.table("users").select(
                    "id, company_id, is_super_admin"
                ).eq("id", user_id).single().execute()
            else:
                raise

        if not target_user.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if target_user.data.get("is_super_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot update super admin users"
            )

        if target_user.data.get("company_id") != company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot update users from other companies"
            )

        # Build update data (only include fields that are provided)
        update_data = {}
        if "first_name" in user_data:
            update_data["first_name"] = user_data["first_name"]
        if "last_name" in user_data:
            update_data["last_name"] = user_data["last_name"]
        if "role" in user_data:
            new_role = user_data["role"]
            current_user_role = current_user.get("role", "member")
            current_user_id = current_user.get("id")
            target_user_role = target_user.data.get("role")

            # Prevent users from changing their own role (regardless of whether it's changing)
            if str(current_user_id) == str(user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You cannot change your own role"
                )

            # Only validate if role is actually changing
            if new_role != target_user_role:

                # Prevent non-owners from changing owner role
                if new_role == "owner" or target_user_role == "owner":
                    if current_user_role != "owner":
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Only owners can assign or change the owner role"
                        )

                # Owners and admins can change other roles
                if current_user_role not in ["owner", "admin"]:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Only owners and admins can assign roles"
                    )

                # If assigning owner role (and user isn't already owner), check there isn't already one
                if new_role == "owner":
                    existing_owner = client.table("users").select("id").eq(
                        "company_id", company_id
                    ).eq("role", "owner").neq("id", user_id).execute()  # Exclude the user being updated
                    if existing_owner.data and len(existing_owner.data) > 0:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail="Company already has an owner. There can only be one owner per company."
                        )

            update_data["role"] = new_role
        if "is_active" in user_data:
            update_data["is_active"] = user_data["is_active"]

        # Compute full_name if first_name or last_name is updated
        # Use existing values for fields not being updated
        if "first_name" in update_data or "last_name" in update_data:
            existing_first = target_user.data.get("first_name", "") or ""
            existing_last = target_user.data.get("last_name", "") or ""
            first = update_data.get("first_name", existing_first)
            last = update_data.get("last_name", existing_last)
            update_data["full_name"] = f"{first} {last}".strip() or None

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid fields to update"
            )

        # Update the user
        response = client.table("users").update(update_data).eq("id", user_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        user = response.data[0]
        logger.info(f"User updated: {user_id} in company: {company_id}")

        return {
            "success": True,
            "message": "User updated successfully",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "first_name": user.get("first_name"),
                "last_name": user.get("last_name"),
                "full_name": user.get("full_name"),
                "role": user.get("role"),
                "is_active": user.get("is_active"),
                "company_id": user["company_id"],
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
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


@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload user avatar/profile photo.

    - Accepts image files (PNG, JPG, GIF, WebP)
    - Max file size: 2MB
    - Returns the URL of the uploaded avatar

    The avatar is stored in Supabase Storage and the URL is saved to the user record.
    """
    try:
        client = get_supabase_client()
        user_id = current_user["id"]

        # Validate file type
        allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: PNG, JPG, GIF, WebP"
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
        unique_filename = f"{user_id}/{uuid.uuid4()}.{file_ext}"
        storage_path = f"avatars/{unique_filename}"

        # Upload to Supabase Storage
        try:
            # First try to delete any existing avatar in this path
            try:
                client.storage.from_("avatars").remove([f"{user_id}"])
            except:
                pass  # Ignore if no existing files

            # Upload new avatar
            upload_response = client.storage.from_("avatars").upload(
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
        public_url = client.storage.from_("avatars").get_public_url(storage_path)

        # Update user record with avatar URL
        update_response = client.table("users").update({
            "avatar_url": public_url
        }).eq("id", user_id).execute()

        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user avatar URL"
            )

        logger.info(f"Avatar uploaded for user: {user_id}")

        return {
            "success": True,
            "url": public_url,
            "message": "Avatar uploaded successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading avatar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload avatar: {str(e)}"
        )
