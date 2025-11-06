"""
Pydantic models for cloud integration endpoints
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class IntegrationBase(BaseModel):
    """Base integration model"""
    platform: str = Field(..., description="Platform name (google_drive, microsoft, dropbox, confluence)")
    account_email: Optional[str] = Field(None, description="Connected account email")
    account_name: Optional[str] = Field(None, description="Connected account name")


class Integration(IntegrationBase):
    """Full integration model (from database)"""
    id: str
    user_id: str
    access_token: str  # Encrypted
    refresh_token: Optional[str] = None  # Encrypted
    token_expires_at: Optional[datetime] = None
    scopes: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IntegrationConnection(BaseModel):
    """Integration connection status (for frontend)"""
    platform: str
    connected: bool
    accountEmail: Optional[str] = Field(None, alias="account_email")
    accountName: Optional[str] = Field(None, alias="account_name")
    connectedAt: Optional[datetime] = Field(None, alias="created_at")

    class Config:
        populate_by_name = True


class OAuthTokenResponse(BaseModel):
    """Response from OAuth token exchange"""
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    scopes: Optional[List[str]] = None
    account_email: Optional[str] = None
    account_name: Optional[str] = None


class CloudFile(BaseModel):
    """Cloud file metadata"""
    id: str = Field(..., description="File ID in cloud platform")
    name: str = Field(..., description="File name")
    mimeType: str = Field(..., description="MIME type", alias="mime_type")
    size: Optional[int] = Field(None, description="File size in bytes")
    modifiedTime: Optional[datetime] = Field(None, alias="modified_time")
    webViewLink: Optional[str] = Field(None, alias="web_view_link")
    isFolder: bool = Field(False, alias="is_folder")
    parentId: Optional[str] = Field(None, alias="parent_id")

    class Config:
        populate_by_name = True


class CloudFileList(BaseModel):
    """List of cloud files"""
    files: List[CloudFile]
    nextPageToken: Optional[str] = Field(None, description="Token for pagination")


class ImportFilesRequest(BaseModel):
    """Request to import files from cloud storage"""
    fileIds: List[str] = Field(..., description="List of file IDs to import", alias="file_ids")
    category: Optional[str] = Field(None, description="Optional category for imported documents")

    class Config:
        populate_by_name = True


class ImportFilesResponse(BaseModel):
    """Response after importing files"""
    success: bool
    message: str
    documents: List[dict] = Field(default_factory=list, description="Imported document metadata")


class DisconnectResponse(BaseModel):
    """Response after disconnecting integration"""
    success: bool
    message: str
    platform: str
