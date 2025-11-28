"""
FastAPI dependency injection functions
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_access_token
from app.core.database import get_supabase_client
from supabase import Client


# Security scheme
security = HTTPBearer()


async def get_db() -> Client:
    """
    Dependency to get database client

    Returns:
        Client: Supabase client instance
    """
    return get_supabase_client()


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Client = Depends(get_db)
) -> dict:
    """
    Get current authenticated user from JWT token

    Args:
        credentials: HTTP bearer credentials
        db: Database client

    Returns:
        dict: User data

    Raises:
        HTTPException: If authentication fails
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user from database
    try:
        response = db.table("users").select("*").eq("id", user_id).single().execute()
        user = response.data

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[dict]:
    """
    Get user if authenticated, otherwise None (for optional authentication)

    Args:
        credentials: Optional HTTP bearer credentials

    Returns:
        dict or None: User data if authenticated
    """
    if credentials is None:
        return None

    token = credentials.credentials
    payload = decode_access_token(token)

    return payload

async def get_current_admin_user(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Verify that current user is an admin (Githaforge v2.0)

    Accepts: super_admin, admin, owner roles OR is_super_admin flag
    """
    user_role = current_user.get("role", "member")
    is_super_admin = current_user.get("is_super_admin", False)

    # Allow is_super_admin flag OR role-based access
    if not is_super_admin and user_role not in ["super_admin", "admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def require_permission(permission_code: str):
    """
    Dependency factory for permission-based access control

    Args:
        permission_code: Permission code required (e.g., "create_chatbots")

    Returns:
        Dependency function that checks if user has the permission

    Usage:
        @router.post("/chatbots/")
        async def create_chatbot(
            ...,
            _: None = Depends(require_permission("create_chatbots"))
        ):
            # Only users with create_chatbots permission can access this

    Raises:
        HTTPException: 403 if user lacks permission
    """
    async def permission_checker(current_user: dict = Depends(get_current_user)):
        from app.services.rbac_service import get_rbac_service

        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found"
            )

        # Check if user is super admin (bypasses all permission checks)
        rbac = get_rbac_service()
        is_super_admin = await rbac.check_super_admin(str(user_id))

        if is_super_admin:
            return None  # Super admin has all permissions

        # Check specific permission
        has_permission = await rbac.check_permission(str(user_id), permission_code)

        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {permission_code}"
            )

        return None

    return permission_checker


def require_any_permission(*permission_codes: str):
    """
    Dependency factory requiring ANY of the specified permissions

    Args:
        *permission_codes: Variable number of permission codes

    Returns:
        Dependency function that checks if user has any permission

    Usage:
        @router.put("/chatbots/{id}")
        async def update_chatbot(
            ...,
            _: None = Depends(require_any_permission("edit_chatbots", "deploy_chatbots"))
        ):
            # User needs either edit_chatbots OR deploy_chatbots permission

    Raises:
        HTTPException: 403 if user lacks all specified permissions
    """
    async def permission_checker(current_user: dict = Depends(get_current_user)):
        from app.services.rbac_service import get_rbac_service

        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found"
            )

        # Check if user is super admin
        rbac = get_rbac_service()
        is_super_admin = await rbac.check_super_admin(str(user_id))

        if is_super_admin:
            return None

        # Check if user has any of the permissions
        has_any = await rbac.has_any_permission(str(user_id), list(permission_codes))

        if not has_any:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"One of these permissions required: {', '.join(permission_codes)}"
            )

        return None

    return permission_checker


def require_all_permissions(*permission_codes: str):
    """
    Dependency factory requiring ALL of the specified permissions

    Args:
        *permission_codes: Variable number of permission codes

    Returns:
        Dependency function that checks if user has all permissions

    Usage:
        @router.post("/analytics/export")
        async def export_analytics(
            ...,
            _: None = Depends(require_all_permissions("view_analytics", "export_data"))
        ):
            # User needs BOTH view_analytics AND export_data permissions

    Raises:
        HTTPException: 403 if user lacks any of the specified permissions
    """
    async def permission_checker(current_user: dict = Depends(get_current_user)):
        from app.services.rbac_service import get_rbac_service

        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found"
            )

        # Check if user is super admin
        rbac = get_rbac_service()
        is_super_admin = await rbac.check_super_admin(str(user_id))

        if is_super_admin:
            return None

        # Check if user has all permissions
        has_all = await rbac.has_all_permissions(str(user_id), list(permission_codes))

        if not has_all:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"All of these permissions required: {', '.join(permission_codes)}"
            )

        return None

    return permission_checker