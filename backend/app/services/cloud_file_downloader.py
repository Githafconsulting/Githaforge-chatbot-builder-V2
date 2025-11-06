"""
Cloud file downloader service
Handles downloading and listing files from cloud storage platforms
"""
import io
import tempfile
from typing import List, Dict, Optional, BinaryIO
from datetime import datetime
from app.utils.logger import get_logger

logger = get_logger(__name__)


class CloudFileDownloader:
    """Service for downloading files from cloud platforms"""

    async def list_google_drive_files(
        self,
        access_token: str,
        refresh_token: Optional[str] = None,
        folder_id: Optional[str] = None,
        page_size: int = 50,
        page_token: Optional[str] = None
    ) -> Dict:
        """
        List files from Google Drive

        Args:
            access_token: OAuth access token
            refresh_token: OAuth refresh token (optional, for auto-refresh)
            folder_id: Folder ID to list (None for root)
            page_size: Number of files per page
            page_token: Pagination token

        Returns:
            {
                "files": [CloudFile],
                "nextPageToken": str or None
            }
        """
        try:
            from googleapiclient.discovery import build
            from google.oauth2.credentials import Credentials
            from app.core.config import settings

            # Create credentials with all necessary fields for auto-refresh
            credentials = Credentials(
                token=access_token,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=settings.GOOGLE_CLIENT_ID,
                client_secret=settings.GOOGLE_CLIENT_SECRET
            )

            # Build Drive API client
            service = build('drive', 'v3', credentials=credentials)

            # Build query
            query_parts = []
            if folder_id:
                query_parts.append(f"'{folder_id}' in parents")
            else:
                query_parts.append("'root' in parents")

            query_parts.append("trashed = false")
            query = " and ".join(query_parts)

            # List files
            results = service.files().list(
                q=query,
                pageSize=page_size,
                pageToken=page_token,
                fields="nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, parents)",
                orderBy="folder,name"
            ).execute()

            files = results.get('files', [])

            # Format files
            formatted_files = []
            for file in files:
                formatted_files.append({
                    "id": file['id'],
                    "name": file['name'],
                    "mimeType": file['mimeType'],
                    "size": int(file.get('size', 0)) if file.get('size') else None,
                    "modifiedTime": file.get('modifiedTime'),
                    "webViewLink": file.get('webViewLink'),
                    "isFolder": file['mimeType'] == 'application/vnd.google-apps.folder',
                    "parentId": file.get('parents', [None])[0] if file.get('parents') else None
                })

            logger.info(f"Listed {len(formatted_files)} files from Google Drive folder {folder_id or 'root'}")

            return {
                "files": formatted_files,
                "nextPageToken": results.get('nextPageToken')
            }

        except Exception as e:
            logger.error(f"Error listing Google Drive files: {e}")
            raise

    async def download_google_drive_file(
        self,
        file_id: str,
        access_token: str,
        refresh_token: Optional[str] = None
    ) -> Dict:
        """
        Download file from Google Drive

        Args:
            file_id: Google Drive file ID
            access_token: OAuth access token
            refresh_token: OAuth refresh token (optional, for auto-refresh)

        Returns:
            {
                "file_name": str,
                "file_type": str,
                "file_size": int,
                "content": bytes,
                "mime_type": str
            }
        """
        try:
            from googleapiclient.discovery import build
            from googleapiclient.http import MediaIoBaseDownload
            from google.oauth2.credentials import Credentials
            from app.core.config import settings

            # Create credentials with all necessary fields for auto-refresh
            credentials = Credentials(
                token=access_token,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=settings.GOOGLE_CLIENT_ID,
                client_secret=settings.GOOGLE_CLIENT_SECRET
            )

            # Build Drive API client
            service = build('drive', 'v3', credentials=credentials)

            # Get file metadata
            file_metadata = service.files().get(
                fileId=file_id,
                fields="id, name, mimeType, size"
            ).execute()

            file_name = file_metadata['name']
            mime_type = file_metadata['mimeType']
            file_size = int(file_metadata.get('size', 0)) if file_metadata.get('size') else 0

            logger.info(f"Downloading Google Drive file: {file_name} ({mime_type})")

            # Handle Google Docs/Sheets/Slides (need export)
            if mime_type.startswith('application/vnd.google-apps.'):
                content, export_mime_type = await self._export_google_doc(service, file_id, mime_type, file_name)
                mime_type = export_mime_type
            else:
                # Download regular file
                request = service.files().get_media(fileId=file_id)
                file_handle = io.BytesIO()
                downloader = MediaIoBaseDownload(file_handle, request)

                done = False
                while not done:
                    status, done = downloader.next_chunk()
                    if status:
                        logger.debug(f"Download progress: {int(status.progress() * 100)}%")

                content = file_handle.getvalue()
                file_size = len(content)

            logger.info(f"Successfully downloaded {file_name} ({file_size} bytes)")

            return {
                "file_name": file_name,
                "file_type": self._get_file_extension(file_name, mime_type),
                "file_size": file_size,
                "content": content,
                "mime_type": mime_type
            }

        except Exception as e:
            logger.error(f"Error downloading Google Drive file: {e}")
            raise

    async def _export_google_doc(
        self,
        service,
        file_id: str,
        mime_type: str,
        file_name: str
    ) -> tuple[bytes, str]:
        """
        Export Google Docs/Sheets/Slides to downloadable format

        Args:
            service: Google Drive API service
            file_id: File ID
            mime_type: Google Apps MIME type
            file_name: Original file name

        Returns:
            (content_bytes, export_mime_type)
        """
        # Map Google Apps types to export formats
        export_formats = {
            'application/vnd.google-apps.document': ('application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'),
            'application/vnd.google-apps.spreadsheet': ('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx'),
            'application/vnd.google-apps.presentation': ('application/vnd.openxmlformats-officedocument.presentationml.presentation', '.pptx'),
            'application/vnd.google-apps.drawing': ('application/pdf', '.pdf'),
        }

        if mime_type not in export_formats:
            # Default to PDF for unsupported Google Apps types
            export_mime_type = 'application/pdf'
            logger.warning(f"Unsupported Google Apps type {mime_type}, exporting as PDF")
        else:
            export_mime_type, _ = export_formats[mime_type]

        logger.info(f"Exporting Google Doc {file_name} to {export_mime_type}")

        # Export file
        request = service.files().export_media(fileId=file_id, mimeType=export_mime_type)
        file_handle = io.BytesIO()

        from googleapiclient.http import MediaIoBaseDownload
        downloader = MediaIoBaseDownload(file_handle, request)

        done = False
        while not done:
            status, done = downloader.next_chunk()
            if status:
                logger.debug(f"Export progress: {int(status.progress() * 100)}%")

        content = file_handle.getvalue()
        return content, export_mime_type

    def _get_file_extension(self, file_name: str, mime_type: str) -> str:
        """
        Get file extension from name or MIME type

        Args:
            file_name: Original file name
            mime_type: MIME type

        Returns:
            File extension (e.g., 'pdf', 'docx', 'txt')
        """
        # Try to get from file name
        if '.' in file_name:
            return file_name.split('.')[-1].lower()

        # Map common MIME types
        mime_to_ext = {
            'application/pdf': 'pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            'application/msword': 'doc',
            'text/plain': 'txt',
            'text/html': 'html',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
            'application/vnd.ms-excel': 'xls',
        }

        return mime_to_ext.get(mime_type, 'bin')

    async def get_folder_path(
        self,
        folder_id: str,
        access_token: str,
        refresh_token: Optional[str] = None
    ) -> List[Dict]:
        """
        Get breadcrumb path for a folder

        Args:
            folder_id: Google Drive folder ID
            access_token: OAuth access token
            refresh_token: OAuth refresh token (optional, for auto-refresh)

        Returns:
            List of folders from root to current folder
        """
        try:
            from googleapiclient.discovery import build
            from google.oauth2.credentials import Credentials
            from app.core.config import settings

            # Create credentials with all necessary fields for auto-refresh
            credentials = Credentials(
                token=access_token,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=settings.GOOGLE_CLIENT_ID,
                client_secret=settings.GOOGLE_CLIENT_SECRET
            )
            service = build('drive', 'v3', credentials=credentials)

            breadcrumb = []
            current_id = folder_id

            while current_id:
                folder_metadata = service.files().get(
                    fileId=current_id,
                    fields="id, name, parents"
                ).execute()

                breadcrumb.insert(0, {
                    "id": folder_metadata['id'],
                    "name": folder_metadata['name']
                })

                # Get parent
                parents = folder_metadata.get('parents', [])
                current_id = parents[0] if parents else None

            # Add root
            breadcrumb.insert(0, {
                "id": "root",
                "name": "My Drive"
            })

            return breadcrumb

        except Exception as e:
            logger.error(f"Error getting folder path: {e}")
            return [{"id": "root", "name": "My Drive"}]


# Singleton instance
_cloud_file_downloader = None


def get_cloud_file_downloader() -> CloudFileDownloader:
    """Get singleton cloud file downloader instance"""
    global _cloud_file_downloader
    if _cloud_file_downloader is None:
        _cloud_file_downloader = CloudFileDownloader()
    return _cloud_file_downloader
