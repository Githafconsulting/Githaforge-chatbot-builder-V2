"""
OAuth provider configurations and helpers for cloud integrations
Supports: Google Drive, Microsoft 365, Dropbox, Confluence
"""
from typing import Dict, Optional
from datetime import datetime, timedelta
from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class GoogleDriveOAuth:
    """Google Drive OAuth 2.0 handler"""

    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = f"{settings.API_BASE_URL}/api/v1/integrations/google_drive/callback"
        self.scopes = [
            'openid',  # Google automatically adds this, so include it to avoid scope mismatch
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/drive.metadata.readonly'
        ]

        if not self.client_id or not self.client_secret:
            logger.warning("Google OAuth credentials not configured")

    def get_authorization_url(self, state: Optional[str] = None) -> str:
        """
        Generate OAuth authorization URL

        Args:
            state: Optional state parameter for CSRF protection

        Returns:
            str: Authorization URL to redirect user to
        """
        try:
            from google_auth_oauthlib.flow import Flow

            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [self.redirect_uri]
                    }
                },
                scopes=self.scopes,
                redirect_uri=self.redirect_uri
            )

            auth_url, _ = flow.authorization_url(
                access_type='offline',  # Request refresh token
                include_granted_scopes='true',
                prompt='consent',  # Force consent screen to get refresh token
                state=state
            )

            logger.info(f"Generated Google OAuth URL")
            return auth_url

        except Exception as e:
            logger.error(f"Error generating Google OAuth URL: {e}")
            raise

    async def exchange_code_for_tokens(self, code: str) -> Dict:
        """
        Exchange authorization code for access & refresh tokens

        Args:
            code: Authorization code from OAuth callback

        Returns:
            dict: Token information including access_token, refresh_token, expires_at, etc.
        """
        try:
            import requests
            from googleapiclient.discovery import build
            from google.oauth2.credentials import Credentials

            # Exchange code for tokens directly using Google's token endpoint
            # This bypasses google-auth-oauthlib's strict scope validation
            token_url = "https://oauth2.googleapis.com/token"
            data = {
                "code": code,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "redirect_uri": self.redirect_uri,
                "grant_type": "authorization_code"
            }

            response = requests.post(token_url, data=data)
            response.raise_for_status()
            token_data = response.json()

            # Create credentials from token response
            credentials = Credentials(
                token=token_data.get("access_token"),
                refresh_token=token_data.get("refresh_token"),
                token_uri=token_url,
                client_id=self.client_id,
                client_secret=self.client_secret,
                scopes=token_data.get("scope", "").split()
            )

            # Get user info
            oauth_service = build('oauth2', 'v2', credentials=credentials)
            user_info = oauth_service.userinfo().get().execute()

            # Calculate expiry
            expires_in = token_data.get("expires_in", 3600)
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

            result = {
                'access_token': token_data.get("access_token"),
                'refresh_token': token_data.get("refresh_token"),
                'expires_at': expires_at,
                'scopes': token_data.get("scope", "").split(),
                'account_email': user_info.get('email'),
                'account_name': user_info.get('name')
            }

            logger.info(f"Successfully exchanged Google OAuth code for tokens")
            return result

        except Exception as e:
            logger.error(f"Error exchanging Google OAuth code: {e}")
            raise

    async def refresh_access_token(self, refresh_token: str) -> Dict:
        """
        Refresh expired access token

        Args:
            refresh_token: Refresh token from database

        Returns:
            dict: New access_token and expires_at
        """
        try:
            from google.oauth2.credentials import Credentials
            from google.auth.transport.requests import Request

            credentials = Credentials(
                token=None,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=self.client_id,
                client_secret=self.client_secret,
                scopes=self.scopes
            )

            credentials.refresh(Request())

            result = {
                'access_token': credentials.token,
                'expires_at': credentials.expiry
            }

            logger.info("Successfully refreshed Google access token")
            return result

        except Exception as e:
            logger.error(f"Error refreshing Google access token: {e}")
            raise


# Placeholder classes for future implementation
class MicrosoftOAuth:
    """Microsoft 365 OAuth 2.0 handler (SharePoint, OneDrive, Teams)"""

    def __init__(self):
        logger.warning("Microsoft OAuth not yet implemented")

    def get_authorization_url(self, state: Optional[str] = None) -> str:
        raise NotImplementedError("Microsoft OAuth coming in Phase 2")

    async def exchange_code_for_tokens(self, code: str) -> Dict:
        raise NotImplementedError("Microsoft OAuth coming in Phase 2")

    async def refresh_access_token(self, refresh_token: str) -> Dict:
        raise NotImplementedError("Microsoft OAuth coming in Phase 2")


class DropboxOAuth:
    """Dropbox OAuth 2.0 handler"""

    def __init__(self):
        logger.warning("Dropbox OAuth not yet implemented")

    def get_authorization_url(self, state: Optional[str] = None) -> str:
        raise NotImplementedError("Dropbox OAuth coming in Phase 3")

    async def exchange_code_for_tokens(self, code: str) -> Dict:
        raise NotImplementedError("Dropbox OAuth coming in Phase 3")


class ConfluenceOAuth:
    """Confluence OAuth 2.0 handler"""

    def __init__(self):
        logger.warning("Confluence OAuth not yet implemented")

    def get_authorization_url(self, state: Optional[str] = None) -> str:
        raise NotImplementedError("Confluence OAuth coming in Phase 4")

    async def exchange_code_for_tokens(self, code: str) -> Dict:
        raise NotImplementedError("Confluence OAuth coming in Phase 4")


def get_oauth_provider(platform: str):
    """
    Factory function to get OAuth provider instance

    Args:
        platform: Platform name (google_drive, microsoft, dropbox, confluence)

    Returns:
        OAuth provider instance

    Raises:
        ValueError: If platform is not supported
    """
    providers = {
        'google_drive': GoogleDriveOAuth,
        'microsoft': MicrosoftOAuth,
        'dropbox': DropboxOAuth,
        'confluence': ConfluenceOAuth
    }

    if platform not in providers:
        raise ValueError(f"Unsupported platform: {platform}")

    return providers[platform]()

