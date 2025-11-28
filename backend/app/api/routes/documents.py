"""
Document management API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Body
from typing import Optional, List
from pydantic import BaseModel
from app.models.document import Document, DocumentList, DocumentUpload
from app.services.document_service import (
    get_all_documents,
    process_file_upload,
    process_url,
    delete_document,
    get_document_by_id,
    get_document_full_content,
    update_document
)
from app.core.dependencies import get_current_user
from app.core.multitenancy import (
    get_filtered_company_id,
    require_company_association,
    verify_resource_ownership
)
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


class DocumentUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None


@router.get("/", response_model=DocumentList)
async def list_documents(
    limit: int = 100,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all documents in the knowledge base

    Returns documents filtered by user's company.
    Super admins see all documents across all companies.

    Requires authentication
    """
    try:
        # Get company filter (None for super admin, company_id for regular users)
        company_id = get_filtered_company_id(current_user)

        documents = await get_all_documents(
            limit=limit,
            offset=offset,
            company_id=company_id
        )

        return DocumentList(
            documents=documents,
            total=len(documents)
        )

    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    category: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a document file (PDF, TXT, DOCX)

    Document is associated with the user's company.

    Requires authentication
    """
    try:
        # Ensure user has company association
        company_id = require_company_association(current_user)

        # Read file content
        file_content = await file.read()

        # Process file with company_id
        document = await process_file_upload(
            file_content=file_content,
            filename=file.filename,
            category=category,
            company_id=company_id
        )

        return {
            "success": True,
            "message": "Document uploaded and processed successfully",
            "document": document
        }

    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/url")
async def add_url(
    url: str = Form(...),
    category: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Add a document from URL

    Document is associated with the user's company.

    Requires authentication
    """
    try:
        # Ensure user has company association
        company_id = require_company_association(current_user)

        document = await process_url(
            url=url,
            category=category,
            company_id=company_id
        )

        return {
            "success": True,
            "message": "URL content processed successfully",
            "document": document
        }

    except Exception as e:
        logger.error(f"Error processing URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}")
async def get_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific document by ID

    Verifies user owns the document or is super admin.

    Requires authentication
    """
    try:
        document = await get_document_by_id(document_id)

        # Verify ownership
        verify_resource_ownership(document, document_id, current_user, "Document")

        return document

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}/content")
async def get_document_content(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get full document content reconstructed from embedding chunks

    Requires authentication
    """
    try:
        content = await get_document_full_content(document_id)

        if content is None:
            raise HTTPException(status_code=404, detail="Document content not found")

        return {
            "success": True,
            "document_id": document_id,
            "content": content
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document content: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{document_id}")
async def edit_document(
    document_id: str,
    update_request: DocumentUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a document and regenerate embeddings if content changes

    Requires authentication
    """
    try:
        updated_document = await update_document(
            document_id=document_id,
            title=update_request.title,
            content=update_request.content,
            category=update_request.category
        )

        if not updated_document:
            raise HTTPException(status_code=404, detail="Document not found")

        return {
            "success": True,
            "message": "Document updated successfully" + (" and embeddings regenerated" if update_request.content else ""),
            "document": updated_document
        }

    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error updating document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Download document file from storage or generate text file from content

    Requires authentication
    """
    try:
        from fastapi.responses import StreamingResponse
        from app.services.storage_service import get_file_from_storage
        import io

        # Get document metadata
        document = await get_document_by_id(document_id)

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # If document has a storage path, download from storage
        if document.get("storage_path"):
            try:
                file_content = await get_file_from_storage(document["storage_path"])
                filename = document["title"]

                # Return file with appropriate content type
                return StreamingResponse(
                    io.BytesIO(file_content),
                    media_type="application/octet-stream",
                    headers={
                        "Content-Disposition": f'attachment; filename="{filename}"'
                    }
                )
            except Exception as e:
                logger.warning(f"Could not download from storage: {e}. Falling back to content reconstruction.")

        # Fallback: Generate text file from reconstructed content
        content = await get_document_full_content(document_id)

        if content is None:
            raise HTTPException(status_code=404, detail="Document content not found")

        # Generate filename
        filename = document["title"]
        if not filename.endswith('.txt'):
            filename = f"{filename}.txt"

        # Return content as text file
        return StreamingResponse(
            io.BytesIO(content.encode('utf-8')),
            media_type="text/plain",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{document_id}")
async def remove_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a document and its embeddings

    Verifies user owns the document before deletion.

    Requires authentication
    """
    try:
        # First verify ownership
        document = await get_document_by_id(document_id)
        verify_resource_ownership(document, document_id, current_user, "Document")

        # Proceed with deletion
        success = await delete_document(document_id)

        if not success:
            raise HTTPException(status_code=404, detail="Document not found or already deleted")

        return {
            "success": True,
            "message": "Document deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))
