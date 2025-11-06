"""
Integration service for managing OAuth integrations with cloud platforms
Handles CRUD operations, token encryption, and automatic token refresh
"""
from typing import Optional, List, Dict
from datetime import datetime, timedelta, timezone
from app.core.database import get_supabase_client
from app.utils.encryption import encrypt_token, decrypt_token
from app.utils.oauth_providers import get_oauth_provider
from app.utils.logger import get_logger

logger = get_logger(__name__)


class IntegrationService:
    """Service for managing cloud platform integrations"""

    def __init__(self):
        self.client = get_supabase_client()

    async def create_integration(
        self,
        user_id: str,
        platform: str,
        access_token: str,
        refresh_token: Optional[str] = None,
        token_expires_at: Optional[datetime] = None,
        account_email: Optional[str] = None,
        account_name: Optional[str] = None,
        scopes: Optional[List[str]] = None
    ) -> Dict:
        """
        Create or update integration for user

        Args:
            user_id: User UUID
            platform: Platform name (google_drive, microsoft, dropbox, confluence)
            access_token: OAuth access token (will be encrypted)
            refresh_token: OAuth refresh token (will be encrypted)
            token_expires_at: Token expiration timestamp
            account_email: Connected account email
            account_name: Connected account name
            scopes: List of OAuth scopes granted

        Returns:
            Integration record

        Raises:
            Exception: If database operation fails
        """
        try:
            # Encrypt tokens before storage
            encrypted_access_token = encrypt_token(access_token)
            encrypted_refresh_token = encrypt_token(refresh_token) if refresh_token else None

            # Check if integration already exists
            existing = self.client.table("user_integrations").select("id").eq("user_id", user_id).eq("platform", platform).execute()

            integration_data = {
                "user_id": user_id,
                "platform": platform,
                "access_token": encrypted_access_token,
                "refresh_token": encrypted_refresh_token,
                "token_expires_at": token_expires_at.isoformat() if token_expires_at else None,
                "account_email": account_email,
                "account_name": account_name,
                "scopes": scopes,
                "updated_at": datetime.utcnow().isoformat()
            }

            if existing.data and len(existing.data) > 0:
                # Update existing integration
                integration_id = existing.data[0]["id"]
                response = self.client.table("user_integrations").update(integration_data).eq("id", integration_id).execute()
                logger.info(f"Updated integration for user {user_id} platform {platform}")
            else:
                # Create new integration
                integration_data["created_at"] = datetime.utcnow().isoformat()
                response = self.client.table("user_integrations").insert(integration_data).execute()
                logger.info(f"Created integration for user {user_id} platform {platform}")

            if not response.data:
                raise Exception("Failed to save integration to database")

            return response.data[0]

        except Exception as e:
            logger.error(f"Error creating integration: {e}")
            raise

    async def get_user_integrations(self, user_id: str) -> List[Dict]:
        """
        Get all integrations for a user

        Args:
            user_id: User UUID

        Returns:
            List of integration records (with decrypted tokens)
        """
        try:
            response = self.client.table("user_integrations").select("*").eq("user_id", user_id).execute()

            if not response.data:
                return []

            # Decrypt tokens for use
            integrations = []
            for integration in response.data:
                decrypted = self._decrypt_integration(integration)
                integrations.append(decrypted)

            logger.debug(f"Retrieved {len(integrations)} integrations for user {user_id}")
            return integrations

        except Exception as e:
            logger.error(f"Error retrieving integrations: {e}")
            raise

    async def get_integration(self, user_id: str, platform: str) -> Optional[Dict]:
        """
        Get specific integration for user

        Args:
            user_id: User UUID
            platform: Platform name

        Returns:
            Integration record (with decrypted tokens) or None
        """
        try:
            response = self.client.table("user_integrations").select("*").eq("user_id", user_id).eq("platform", platform).execute()

            if not response.data or len(response.data) == 0:
                return None

            integration = response.data[0]
            decrypted = self._decrypt_integration(integration)

            logger.debug(f"Retrieved integration for user {user_id} platform {platform}")
            return decrypted

        except Exception as e:
            logger.error(f"Error retrieving integration: {e}")
            raise

    async def delete_integration(self, user_id: str, platform: str) -> bool:
        """
        Delete integration for user

        Args:
            user_id: User UUID
            platform: Platform name

        Returns:
            True if deleted, False if not found
        """
        try:
            response = self.client.table("user_integrations").delete().eq("user_id", user_id).eq("platform", platform).execute()

            if response.data and len(response.data) > 0:
                logger.info(f"Deleted integration for user {user_id} platform {platform}")
                return True
            else:
                logger.warning(f"Integration not found for user {user_id} platform {platform}")
                return False

        except Exception as e:
            logger.error(f"Error deleting integration: {e}")
            raise

    async def refresh_token_if_expired(self, integration_id: str) -> Optional[Dict]:
        """
        Check if integration token is expired and refresh if needed

        Args:
            integration_id: Integration UUID

        Returns:
            Updated integration record or None if refresh failed
        """
        try:
            # Get integration
            response = self.client.table("user_integrations").select("*").eq("id", integration_id).execute()

            if not response.data or len(response.data) == 0:
                logger.warning(f"Integration {integration_id} not found")
                return None

            integration = response.data[0]

            # Check if token is expired
            if not integration.get("token_expires_at"):
                logger.debug(f"Integration {integration_id} has no expiration, assuming valid")
                return self._decrypt_integration(integration)

            # Parse expires_at timestamp and ensure it has timezone info
            expires_at_str = integration["token_expires_at"]
            if isinstance(expires_at_str, str):
                expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
            else:
                # If it's already a datetime object from database
                expires_at = expires_at_str

            # Ensure expires_at is timezone-aware
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)

            now = datetime.now(timezone.utc)

            # Refresh if expired or expiring in next 5 minutes
            if expires_at <= now + timedelta(minutes=5):
                logger.info(f"Token expired for integration {integration_id}, refreshing...")

                # Decrypt refresh token
                encrypted_refresh_token = integration.get("refresh_token")
                if not encrypted_refresh_token:
                    logger.error(f"No refresh token available for integration {integration_id}")
                    return None

                refresh_token = decrypt_token(encrypted_refresh_token)

                # Get OAuth provider
                platform = integration["platform"]
                oauth_provider = get_oauth_provider(platform)

                # Refresh token
                try:
                    token_data = await oauth_provider.refresh_access_token(refresh_token)

                    # Update integration with new tokens
                    updated = await self.create_integration(
                        user_id=integration["user_id"],
                        platform=platform,
                        access_token=token_data["access_token"],
                        refresh_token=token_data.get("refresh_token", refresh_token),  # Some providers don't return new refresh token
                        token_expires_at=token_data.get("expires_at"),
                        account_email=integration.get("account_email"),
                        account_name=integration.get("account_name"),
                        scopes=integration.get("scopes")
                    )

                    logger.info(f"Successfully refreshed token for integration {integration_id}")
                    return updated

                except Exception as refresh_error:
                    logger.error(f"Failed to refresh token for integration {integration_id}: {refresh_error}")
                    return None
            else:
                logger.debug(f"Token still valid for integration {integration_id}")
                return self._decrypt_integration(integration)

        except Exception as e:
            logger.error(f"Error refreshing token: {e}")
            return None

    def _decrypt_integration(self, integration: Dict) -> Dict:
        """
        Decrypt tokens in integration record

        Args:
            integration: Integration record from database

        Returns:
            Integration with decrypted tokens
        """
        try:
            decrypted = integration.copy()

            if integration.get("access_token"):
                decrypted["access_token"] = decrypt_token(integration["access_token"])

            if integration.get("refresh_token"):
                decrypted["refresh_token"] = decrypt_token(integration["refresh_token"])

            return decrypted

        except Exception as e:
            logger.error(f"Error decrypting integration: {e}")
            raise

    async def get_integration_connection_status(self, user_id: str, platform: str) -> Dict:
        """
        Get connection status for UI (without sensitive token data)

        Args:
            user_id: User UUID
            platform: Platform name

        Returns:
            Connection status object
        """
        try:
            integration = await self.get_integration(user_id, platform)

            if integration:
                return {
                    "platform": platform,
                    "connected": True,
                    "accountEmail": integration.get("account_email"),
                    "accountName": integration.get("account_name"),
                    "connectedAt": integration.get("created_at")
                }
            else:
                return {
                    "platform": platform,
                    "connected": False
                }

        except Exception as e:
            logger.error(f"Error getting connection status: {e}")
            return {
                "platform": platform,
                "connected": False,
                "error": str(e)
            }


# Singleton instance
_integration_service = None


def get_integration_service() -> IntegrationService:
    """Get singleton integration service instance"""
    global _integration_service
    if _integration_service is None:
        _integration_service = IntegrationService()
    return _integration_service
