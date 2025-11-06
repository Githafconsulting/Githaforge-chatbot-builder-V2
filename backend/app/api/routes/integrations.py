"""
Integration API routes for cloud platform OAuth and file management
"""
import os
import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from datetime import datetime

from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.integration import (
    IntegrationConnection,
    CloudFile,
    CloudFileList,
    ImportFilesRequest,
    ImportFilesResponse,
    DisconnectResponse
)
from app.services.integration_service import get_integration_service
from app.services.cloud_file_downloader import get_cloud_file_downloader
from app.utils.oauth_providers import get_oauth_provider
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()

# In-memory state storage for OAuth flow (use Redis in production)
_oauth_states = {}


@router.get("/", response_model=List[IntegrationConnection])
async def get_integrations(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all cloud integrations for current user

    Returns list of integration connection statuses
    """
    try:
        integration_service = get_integration_service()

        platforms = ["google_drive", "microsoft", "dropbox", "confluence"]
        connections = []

        for platform in platforms:
            status = await integration_service.get_integration_connection_status(
                user_id=current_user["id"],
                platform=platform
            )
            connections.append(status)

        return connections

    except Exception as e:
        logger.error(f"Error getting integrations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Google Drive Integration
# ============================================================================

@router.get("/google_drive/connect")
async def connect_google_drive(
    current_user: dict = Depends(get_current_user)
):
    """
    Start Google Drive OAuth flow

    Returns authorization URL for user to visit
    """
    try:
        oauth_provider = get_oauth_provider("google_drive")

        # Generate state token for CSRF protection
        state = secrets.token_urlsafe(32)

        # Store state with user ID (expires in 10 minutes)
        _oauth_states[state] = {
            "user_id": current_user["id"],
            "platform": "google_drive",
            "created_at": datetime.utcnow()
        }

        # Get authorization URL
        auth_url = oauth_provider.get_authorization_url(state=state)

        logger.info(f"Starting Google Drive OAuth for user {current_user['id']}")

        return {
            "authorization_url": auth_url,
            "state": state
        }

    except Exception as e:
        logger.error(f"Error starting Google Drive OAuth: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/google_drive/callback")
async def google_drive_callback(
    code: Optional[str] = Query(None, description="Authorization code from Google"),
    state: str = Query(..., description="State token for CSRF protection"),
    error: Optional[str] = Query(None, description="Error from OAuth provider")
):
    """
    Handle Google Drive OAuth callback

    This endpoint is called by Google after user authorizes the app
    """
    try:
        # Check for OAuth error
        if error:
            logger.error(f"Google Drive OAuth error: {error}")
            # Redirect to OAuth callback page with error
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
            return RedirectResponse(url=f"{frontend_url}/oauth/callback?error={error}")

        # Verify state
        if state not in _oauth_states:
            logger.error(f"Invalid OAuth state: {state}")
            raise HTTPException(status_code=400, detail="Invalid state parameter")

        # Verify code is present (if no error)
        if not code:
            logger.error("OAuth callback missing authorization code")
            raise HTTPException(status_code=400, detail="Authorization code is required")

        oauth_state = _oauth_states.pop(state)
        user_id = oauth_state["user_id"]
        logger.info(f"Processing OAuth callback for user {user_id}")

        # Exchange code for tokens
        logger.info("Exchanging authorization code for tokens")
        oauth_provider = get_oauth_provider("google_drive")
        token_data = await oauth_provider.exchange_code_for_tokens(code)
        logger.info(f"Token exchange successful: {list(token_data.keys())}")

        # Save integration
        logger.info("Saving integration to database")
        integration_service = get_integration_service()
        await integration_service.create_integration(
            user_id=user_id,
            platform="google_drive",
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token"),
            token_expires_at=token_data.get("expires_at"),
            account_email=token_data.get("account_email"),
            account_name=token_data.get("account_name"),
            scopes=token_data.get("scopes")
        )

        logger.info(f"Successfully connected Google Drive for user {user_id}")

        # Redirect to OAuth callback page with success
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return RedirectResponse(url=f"{frontend_url}/oauth/callback?success=google_drive")

    except Exception as e:
        import traceback
        logger.error(f"Error in Google Drive callback: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return RedirectResponse(url=f"{frontend_url}/oauth/callback?error=connection_failed")


@router.delete("/google_drive", response_model=DisconnectResponse)
async def disconnect_google_drive(
    current_user: dict = Depends(get_current_user)
):
    """
    Disconnect Google Drive integration
    """
    try:
        integration_service = get_integration_service()
        deleted = await integration_service.delete_integration(
            user_id=current_user["id"],
            platform="google_drive"
        )

        if deleted:
            logger.info(f"Disconnected Google Drive for user {current_user['id']}")
            return {
                "success": True,
                "message": "Google Drive disconnected successfully",
                "platform": "google_drive"
            }
        else:
            raise HTTPException(status_code=404, detail="Google Drive not connected")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disconnecting Google Drive: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/google_drive/files", response_model=CloudFileList)
async def list_google_drive_files(
    folder_id: Optional[str] = Query(None, description="Folder ID (None for root)"),
    page_token: Optional[str] = Query(None, description="Pagination token"),
    current_user: dict = Depends(get_current_user)
):
    """
    List files from Google Drive

    Returns paginated list of files and folders
    """
    try:
        integration_service = get_integration_service()

        # Get integration and refresh token if needed
        integration = await integration_service.get_integration(
            user_id=current_user["id"],
            platform="google_drive"
        )

        if not integration:
            raise HTTPException(status_code=404, detail="Google Drive not connected")

        # Refresh token if expired
        integration = await integration_service.refresh_token_if_expired(integration["id"])
        if not integration:
            raise HTTPException(status_code=401, detail="Failed to refresh access token")

        # List files
        file_downloader = get_cloud_file_downloader()
        result = await file_downloader.list_google_drive_files(
            access_token=integration["access_token"],
            refresh_token=integration.get("refresh_token"),
            folder_id=folder_id,
            page_token=page_token
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing Google Drive files: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/google_drive/import", response_model=ImportFilesResponse)
async def import_from_google_drive(
    request: ImportFilesRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Import files from Google Drive to knowledge base

    Downloads files, processes them, and adds to vector store
    """
    try:
        from app.services.document_service import get_document_service

        integration_service = get_integration_service()

        # Get integration and refresh token if needed
        integration = await integration_service.get_integration(
            user_id=current_user["id"],
            platform="google_drive"
        )

        if not integration:
            raise HTTPException(status_code=404, detail="Google Drive not connected")

        # Refresh token if expired
        integration = await integration_service.refresh_token_if_expired(integration["id"])
        if not integration:
            raise HTTPException(status_code=401, detail="Failed to refresh access token")

        # Download and process files
        file_downloader = get_cloud_file_downloader()
        document_service = get_document_service()
        imported_documents = []
        failed_files = []
        MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB limit for Supabase free tier

        for file_id in request.fileIds:
            try:
                # Download file
                file_data = await file_downloader.download_google_drive_file(
                    file_id=file_id,
                    access_token=integration["access_token"],
                    refresh_token=integration.get("refresh_token")
                )

                # Check file size
                if file_data["file_size"] > MAX_FILE_SIZE:
                    logger.warning(f"File {file_data['file_name']} exceeds 50MB limit ({file_data['file_size']} bytes), skipping")
                    failed_files.append({
                        "file_name": file_data["file_name"],
                        "error": f"File too large ({file_data['file_size'] / 1024 / 1024:.1f}MB). Maximum size is 50MB."
                    })
                    continue

                # Process and store in knowledge base
                document = await document_service.process_file_upload(
                    file_content=file_data["content"],
                    filename=file_data["file_name"],
                    file_type=file_data["file_type"],
                    category=request.category,
                    source_type="upload",  # Changed from "google_drive" to "upload" to match DB constraint
                    source_url=f"https://drive.google.com/file/d/{file_id}"
                )

                imported_documents.append({
                    "id": document["id"],
                    "title": document["title"],
                    "file_type": document["file_type"],
                    "chunk_count": document["chunk_count"]
                })

                logger.info(f"Imported Google Drive file: {file_data['file_name']}")

            except Exception as file_error:
                logger.error(f"Error importing file {file_id}: {file_error}")
                failed_files.append({
                    "file_id": file_id,
                    "error": str(file_error)
                })
                # Continue with other files

        if len(imported_documents) == 0 and len(failed_files) > 0:
            error_details = "; ".join([f"{f.get('file_name', f.get('file_id'))}: {f['error']}" for f in failed_files])
            raise HTTPException(status_code=400, detail=f"Failed to import files: {error_details}")

        return {
            "success": True,
            "message": f"Successfully imported {len(imported_documents)} file(s)",
            "documents": imported_documents
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing from Google Drive: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Microsoft 365 Integration (Placeholder for Phase 2)
# ============================================================================

@router.get("/microsoft/connect")
async def connect_microsoft(current_user: dict = Depends(get_current_user)):
    """Microsoft 365 OAuth (Coming in Phase 2)"""
    raise HTTPException(status_code=501, detail="Microsoft 365 integration coming soon")


@router.delete("/microsoft")
async def disconnect_microsoft(current_user: dict = Depends(get_current_user)):
    """Disconnect Microsoft 365 (Coming in Phase 2)"""
    raise HTTPException(status_code=501, detail="Microsoft 365 integration coming soon")


# ============================================================================
# Dropbox Integration (Placeholder for Phase 3)
# ============================================================================

@router.get("/dropbox/connect")
async def connect_dropbox(current_user: dict = Depends(get_current_user)):
    """Dropbox OAuth (Coming in Phase 3)"""
    raise HTTPException(status_code=501, detail="Dropbox integration coming soon")


@router.delete("/dropbox")
async def disconnect_dropbox(current_user: dict = Depends(get_current_user)):
    """Disconnect Dropbox (Coming in Phase 3)"""
    raise HTTPException(status_code=501, detail="Dropbox integration coming soon")


# ============================================================================
# Confluence Integration (Placeholder for Phase 4)
# ============================================================================

@router.get("/confluence/connect")
async def connect_confluence(current_user: dict = Depends(get_current_user)):
    """Confluence OAuth (Coming in Phase 4)"""
    raise HTTPException(status_code=501, detail="Confluence integration coming soon")


@router.delete("/confluence")
async def disconnect_confluence(current_user: dict = Depends(get_current_user)):
    """Disconnect Confluence (Coming in Phase 4)"""
    raise HTTPException(status_code=501, detail="Confluence integration coming soon")
