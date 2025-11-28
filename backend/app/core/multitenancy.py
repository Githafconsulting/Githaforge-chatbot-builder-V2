"""
Multitenancy Helper Functions

Reusable utilities for enforcing company isolation across all endpoints.
Follows DRY principle - define once, use everywhere.
"""
from fastapi import HTTPException, status
from typing import Optional, Dict


def get_company_context(current_user: Dict) -> tuple[Optional[str], bool]:
    """
    Extract company_id and super_admin status from current user.

    Returns:
        tuple: (company_id, is_super_admin)
            - company_id: User's company ID or None
            - is_super_admin: True if user is super admin

    Usage:
        company_id, is_super_admin = get_company_context(current_user)
    """
    company_id = current_user.get("company_id")
    is_super_admin = current_user.get("is_super_admin", False)
    return company_id, is_super_admin


def get_filtered_company_id(current_user: Dict) -> Optional[str]:
    """
    Get company_id for filtering queries.

    Super admins get None (no filter = see all companies).
    Regular users get their company_id (filtered to their company).

    Returns:
        Optional[str]: company_id for filtering, or None for super admin

    Usage:
        filter_company_id = get_filtered_company_id(current_user)
        resources = await get_resources(company_id=filter_company_id)
    """
    company_id, is_super_admin = get_company_context(current_user)
    return None if is_super_admin else company_id


def verify_company_access(
    resource_company_id: str,
    current_user: Dict,
    resource_name: str = "resource"
) -> None:
    """
    Verify user has access to a specific company's resource.

    Raises 403 if user tries to access another company's resource.
    Super admins bypass this check.

    Args:
        resource_company_id: Company ID of the resource being accessed
        current_user: Current authenticated user
        resource_name: Name of resource for error message (default: "resource")

    Raises:
        HTTPException: 403 if access denied

    Usage:
        verify_company_access(document.company_id, current_user, "document")
    """
    company_id, is_super_admin = get_company_context(current_user)

    # Super admin can access everything
    if is_super_admin:
        return

    # Regular user must match company
    if company_id != resource_company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: You cannot access another company's {resource_name}"
        )


def require_company_association(current_user: Dict) -> str:
    """
    Ensure user is associated with a company.

    Raises 403 if user has no company_id (except super admins).

    Args:
        current_user: Current authenticated user

    Returns:
        str: User's company_id

    Raises:
        HTTPException: 403 if user has no company association

    Usage:
        company_id = require_company_association(current_user)
        await create_resource(company_id=company_id)
    """
    company_id, is_super_admin = get_company_context(current_user)

    if not company_id and not is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    return company_id


def verify_resource_ownership(
    resource: Optional[Dict],
    resource_id: str,
    current_user: Dict,
    resource_name: str = "Resource"
) -> None:
    """
    Verify resource exists and user owns it.

    Combines existence check + ownership verification.

    Args:
        resource: Resource object (or None if not found)
        resource_id: ID of the resource
        current_user: Current authenticated user
        resource_name: Name for error messages

    Raises:
        HTTPException:
            - 404 if resource not found
            - 403 if user doesn't own the resource

    Usage:
        document = await get_document(doc_id)
        verify_resource_ownership(document, doc_id, current_user, "Document")
    """
    # Check existence
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource_name} not found"
        )

    # Check ownership
    resource_company_id = resource.get("company_id")
    if resource_company_id:
        verify_company_access(resource_company_id, current_user, resource_name.lower())


# Convenience function combining common pattern
def get_company_filter_params(current_user: Dict) -> Dict[str, Optional[str]]:
    """
    Get common filter parameters for queries.

    Returns dict with company_id for easy unpacking.

    Returns:
        Dict with 'company_id' key

    Usage:
        filter_params = get_company_filter_params(current_user)
        resources = await get_resources(**filter_params)
    """
    return {"company_id": get_filtered_company_id(current_user)}
