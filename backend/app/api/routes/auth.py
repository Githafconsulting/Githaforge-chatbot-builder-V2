"""
Authentication API endpoints
"""
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta, datetime, timezone
from typing import Dict, Any
from app.models.user import Token, CompanySignup, UnifiedSignup, SignupResponse
from app.core.database import get_supabase_client
from app.core.security import verify_password, create_access_token, get_password_hash
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Admin login endpoint (for company users only)

    Super admins must use /super-admin-login instead.
    Returns JWT access token
    """
    try:
        client = get_supabase_client()

        # Find user by email (username field contains email)
        response = client.table("users").select("*").eq("email", form_data.username).execute()

        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password"
            )

        user = response.data[0]

        # Block super admins from using regular login
        if user.get("is_super_admin", False):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Please use the super admin login page"
            )

        # Convert any bytes fields to strings (Supabase may return bytes)
        for key, value in user.items():
            if isinstance(value, bytes):
                user[key] = value.decode('utf-8')

        # Verify password
        if not verify_password(form_data.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password"
            )

        # Check if user is active
        if not user.get("is_active", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )

        # Create access token with company_id, role, and full_name for multi-tenant support
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        token_data = {
            "sub": str(user["id"]),
            "company_id": str(user.get("company_id")) if user.get("company_id") else None,
            "role": user.get("role", "member"),
            "full_name": user.get("full_name")
        }
        access_token = create_access_token(
            data=token_data,
            expires_delta=access_token_expires
        )

        logger.info(f"User logged in: {user['email']}")

        return Token(access_token=access_token, token_type="bearer")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@router.post("/refresh", response_model=Token)
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """
    Refresh access token for authenticated users.

    Returns a new JWT token with extended expiration.
    The current token must still be valid (not expired).
    """
    try:
        # Create new token with fresh expiration
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        token_data = {
            "sub": str(current_user["id"]),
            "company_id": str(current_user.get("company_id")) if current_user.get("company_id") else None,
            "role": current_user.get("role", "member"),
            "full_name": current_user.get("full_name"),
            "is_super_admin": current_user.get("is_super_admin", False)
        }

        access_token = create_access_token(
            data=token_data,
            expires_delta=access_token_expires
        )

        logger.info(f"Token refreshed for user: {current_user.get('email')}")

        return Token(access_token=access_token, token_type="bearer")

    except Exception as e:
        logger.error(f"Error refreshing token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token"
        )


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def company_signup(signup_data: CompanySignup):
    """
    Company registration endpoint

    Creates:
    1. New company with default settings
    2. Owner user with full permissions
    3. Predefined roles for the company
    4. Default chatbot (optional - can be created later)

    Returns JWT access token for immediate login
    """
    try:
        client = get_supabase_client()

        # 1. Check if email already exists
        existing_user = client.table("users").select("id").eq("email", signup_data.email).execute()
        if existing_user.data and len(existing_user.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # 2. Check if company name already exists
        existing_company = client.table("companies").select("id").eq("name", signup_data.company_name).execute()
        if existing_company.data and len(existing_company.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company name already taken"
            )

        # 3. Create company
        company_data = {
            "name": signup_data.company_name,
            "website": signup_data.website,
            "industry": signup_data.industry,
            "company_size": signup_data.company_size,
            "plan": "free",  # Default plan
            "is_active": True
        }

        company_response = client.table("companies").insert(company_data).execute()
        if not company_response.data or len(company_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create company"
            )

        company = company_response.data[0]
        company_id = company["id"]

        logger.info(f"Created company: {signup_data.company_name} (ID: {company_id})")

        # 4. Get "Owner" role (created by database seed)
        owner_role = client.table("roles").select("id").eq("code", "owner").is_("company_id", "null").execute()

        if not owner_role.data or len(owner_role.data) == 0:
            # Fallback: Create owner role if seed didn't run
            logger.warning("Owner role not found in database - creating it")
            role_response = client.table("roles").insert({
                "code": "owner",
                "name": "Owner",
                "company_id": None,  # Predefined role
                "is_custom": False
            }).execute()
            role_id = role_response.data[0]["id"] if role_response.data else None
        else:
            role_id = owner_role.data[0]["id"]

        # 5. Hash password
        password_hash = get_password_hash(signup_data.password)

        # 6. Create owner user
        user_data = {
            "email": signup_data.email,
            "password_hash": password_hash,
            "full_name": signup_data.full_name,
            "company_id": company_id,
            "role_id": role_id,
            "role": "owner",  # Legacy field for backward compatibility
            "is_active": True,
            "is_admin": True  # Company owners are admins for their company
        }

        user_response = client.table("users").insert(user_data).execute()
        if not user_response.data or len(user_response.data) == 0:
            # Rollback: Delete company if user creation fails
            client.table("companies").delete().eq("id", company_id).execute()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account"
            )

        user = user_response.data[0]
        user_id = user["id"]

        logger.info(f"Created owner user: {signup_data.email} (ID: {user_id})")

        # 7. Create predefined roles for company (optional - can be done by migration)
        # This step is optional since roles can be created on-demand

        # 8. Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        token_data = {
            "sub": str(user_id),
            "company_id": str(company_id),
            "role": "owner",
            "full_name": signup_data.full_name
        }
        access_token = create_access_token(
            data=token_data,
            expires_delta=access_token_expires
        )

        logger.info(f"Company signup successful: {signup_data.company_name}")

        return SignupResponse(
            access_token=access_token,
            token_type="bearer",
            company_id=company_id,
            user_id=user_id,
            message=f"Company '{signup_data.company_name}' registered successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during company signup: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup failed: {str(e)}"
        )


async def verify_recaptcha(token: str) -> bool:
    """
    Verify reCAPTCHA token with Google's API.
    Returns True if verification passes, False otherwise.
    """
    import httpx

    if not settings.RECAPTCHA_ENABLED:
        logger.info("reCAPTCHA verification skipped (disabled in settings)")
        return True

    if not settings.RECAPTCHA_SECRET_KEY:
        logger.warning("reCAPTCHA secret key not configured")
        return True  # Allow signup if not configured (dev mode)

    if not token:
        logger.warning("No reCAPTCHA token provided")
        return False

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.google.com/recaptcha/api/siteverify",
                data={
                    "secret": settings.RECAPTCHA_SECRET_KEY,
                    "response": token
                }
            )
            result = response.json()
            success = result.get("success", False)

            if not success:
                logger.warning(f"reCAPTCHA verification failed: {result.get('error-codes', [])}")

            return success
    except Exception as e:
        logger.error(f"reCAPTCHA verification error: {e}")
        return False  # Fail closed - reject if verification fails


@router.post("/unified-signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def unified_signup(signup_data: UnifiedSignup):
    """
    Unified registration endpoint supporting both individual and company accounts.

    **Individual accounts (account_type='individual'):**
    - Creates a personal workspace with is_personal=True
    - Workspace name defaults to "{full_name}'s Workspace"
    - Limited to 1 team member (owner only)
    - Can convert to company account later

    **Company accounts (account_type='company'):**
    - Creates standard company with is_personal=False
    - company_name is REQUIRED
    - Can invite unlimited team members (based on plan)
    - Full multi-tenant features

    **reCAPTCHA:**
    - Required when RECAPTCHA_ENABLED=True
    - Pass recaptcha_token from Google reCAPTCHA v2 widget

    Returns JWT access token for immediate login.
    """
    try:
        client = get_supabase_client()

        # Verify reCAPTCHA token
        if settings.RECAPTCHA_ENABLED:
            if not await verify_recaptcha(signup_data.recaptcha_token):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="reCAPTCHA verification failed. Please try again."
                )

        # Validate company_name is provided for company accounts
        if signup_data.account_type == "company" and not signup_data.company_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company name is required for company accounts"
            )

        # Compute full_name from first_name + last_name if not provided directly
        first_name = signup_data.first_name or ""
        last_name = signup_data.last_name or ""

        if signup_data.full_name:
            # full_name provided directly (backward compatibility)
            full_name = signup_data.full_name
            # Try to extract first/last if not provided
            if not first_name and not last_name:
                name_parts = full_name.split(" ", 1)
                first_name = name_parts[0] if name_parts else ""
                last_name = name_parts[1] if len(name_parts) > 1 else ""
        elif first_name or last_name:
            # first_name/last_name provided
            full_name = f"{first_name} {last_name}".strip()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either full_name or first_name/last_name is required"
            )

        # 1. Check if email already exists
        existing_user = client.table("users").select("id").eq("email", signup_data.email).execute()
        if existing_user.data and len(existing_user.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # 2. Determine workspace name
        is_personal = signup_data.account_type == "individual"
        if is_personal:
            workspace_name = f"{full_name}'s Workspace"
        else:
            workspace_name = signup_data.company_name

        # 3. Check if workspace/company name already exists
        existing_company = client.table("companies").select("id").eq("name", workspace_name).execute()
        if existing_company.data and len(existing_company.data) > 0:
            if is_personal:
                # For personal workspaces, append a number to make unique
                import random
                workspace_name = f"{full_name}'s Workspace {random.randint(1000, 9999)}"
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Company name already taken"
                )

        # 4. Create company/workspace
        # Calculate trial end date (14 days from now) for free tier users
        trial_ends_at = None
        if (signup_data.subscription_tier or "free") == "free":
            trial_ends_at = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()

        company_data = {
            "name": workspace_name,
            "website": signup_data.website,
            "industry": signup_data.industry,
            "company_size": signup_data.company_size if not is_personal else "1-10",
            "plan": signup_data.subscription_tier or "free",
            "is_personal": is_personal,
            "max_team_members": 1 if is_personal else 5,  # Individual = 1, Company = 5 default
            "is_active": True,
        }

        # Only add trial_ends_at if we have a value (column may not exist yet)
        if trial_ends_at:
            company_data["trial_ends_at"] = trial_ends_at

        # Try to insert company - retry without trial_ends_at if column doesn't exist
        try:
            company_response = client.table("companies").insert(company_data).execute()
        except Exception as e:
            if "trial_ends_at" in str(e):
                # Column doesn't exist yet, retry without it
                logger.warning("trial_ends_at column not found, inserting without it")
                company_data.pop("trial_ends_at", None)
                company_response = client.table("companies").insert(company_data).execute()
            else:
                raise
        if not company_response.data or len(company_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create workspace"
            )

        company = company_response.data[0]
        company_id = company["id"]

        account_label = "personal workspace" if is_personal else "company"
        logger.info(f"Created {account_label}: {workspace_name} (ID: {company_id})")

        # 5. Get "Owner" role
        owner_role = client.table("roles").select("id").eq("code", "owner").is_("company_id", "null").execute()

        if not owner_role.data or len(owner_role.data) == 0:
            logger.warning("Owner role not found - creating it")
            role_response = client.table("roles").insert({
                "code": "owner",
                "name": "Owner",
                "company_id": None,
                "is_custom": False
            }).execute()
            role_id = role_response.data[0]["id"] if role_response.data else None
        else:
            role_id = owner_role.data[0]["id"]

        # 6. Hash password
        password_hash = get_password_hash(signup_data.password)

        # 7. Create owner user
        user_data = {
            "email": signup_data.email,
            "password_hash": password_hash,
            "first_name": first_name or None,
            "last_name": last_name or None,
            "full_name": full_name,
            "company_id": company_id,
            "role_id": role_id,
            "role": "owner",
            "is_active": True,
            "is_admin": True,
            # New fields from enhanced signup
            "phone": signup_data.phone or None,
            "contact_email": signup_data.contact_email or None,
            "marketing_consent": signup_data.marketing_consent,
            "wants_consultation": signup_data.wants_consultation,
        }

        user_response = client.table("users").insert(user_data).execute()
        if not user_response.data or len(user_response.data) == 0:
            # Rollback: Delete company if user creation fails
            client.table("companies").delete().eq("id", company_id).execute()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account"
            )

        user = user_response.data[0]
        user_id = user["id"]

        logger.info(f"Created owner user: {signup_data.email} (ID: {user_id})")

        # 8. Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        token_data = {
            "sub": str(user_id),
            "company_id": str(company_id),
            "role": "owner",
            "full_name": full_name  # Use computed full_name (from first_name + last_name), not signup_data.full_name
        }
        access_token = create_access_token(
            data=token_data,
            expires_delta=access_token_expires
        )

        logger.info(f"Unified signup successful: {workspace_name} ({signup_data.account_type})")

        return SignupResponse(
            access_token=access_token,
            token_type="bearer",
            company_id=company_id,
            user_id=user_id,
            message=f"{'Personal workspace' if is_personal else 'Company'} '{workspace_name}' created successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during unified signup: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup failed: {str(e)}"
        )


@router.post("/super-admin-login", response_model=Token)
async def super_admin_login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Super admin login endpoint (for Githaf platform admins)

    Super admins have:
    - is_super_admin = True
    - company_id = NULL (not tied to any company)
    - Access to all companies and data

    Returns JWT with is_super_admin flag for RLS bypass
    """
    try:
        client = get_supabase_client()

        # Find user by email with is_super_admin flag
        response = client.table("users").select("*").eq("email", form_data.username).eq("is_super_admin", True).execute()

        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid super admin credentials"
            )

        user = response.data[0]

        # Verify password
        if not verify_password(form_data.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid super admin credentials"
            )

        # Check if user is active
        if not user.get("is_active", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super admin account is inactive"
            )

        # Create access token with is_super_admin flag
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        token_data = {
            "sub": str(user["id"]),
            "company_id": None,  # Super admins have no company
            "role": "super_admin",
            "is_super_admin": True  # Flag for RLS bypass
        }
        access_token = create_access_token(
            data=token_data,
            expires_delta=access_token_expires
        )

        logger.info(f"Super admin logged in: {user['email']}")

        return Token(access_token=access_token, token_type="bearer")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during super admin login: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Super admin login failed: {str(e)}"
        )
